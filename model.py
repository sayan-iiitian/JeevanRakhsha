import os
import time
import requests
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.schema.runnable import RunnableMap
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

# Define prompts
prompt1 = PromptTemplate(
    input_variables=["text"],
    template=(
        "You are a disaster type classifier. "
        "Given the following user report (in any language), identify the type of disaster present in a single word or short phrase. "
        "Possible disaster types include: fire, flood, earthquake, landslide, cyclone, drought, tsunami, pandemic, accident, explosion, tornado, hailstorm, storm, volcanic eruption, etc. "
        "If none detected, answer 'none'.\n"
        "Text: {text}\n"
        "Disaster type:"
    )
)

prompt2 = PromptTemplate(
    input_variables=["text"],
    template="Explain the disaster type in detail: {text}"
)

priority_score_prompt = PromptTemplate(
    input_variables=["text"],
    template=(
        "Given the following SOS report, assign a numeric priority score from 1 to 1000.\n"
        "A higher number means more urgent or life-threatening.\n"
        "Text: {text}\n"
        "Only reply with the number."
    )
)

priority_reason_prompt = PromptTemplate(
    input_variables=["text"],
    template="Give a one-line reason why this report received that priority score:\n\n{text}"
)

model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", 
    temperature=0.2
    )
parser = StrOutputParser()

def build_chain():
    classify_chain = prompt1 | model | parser
    score_chain = priority_score_prompt | model | parser
    reason_chain = priority_reason_prompt | model | parser
    explain_chain = prompt2 | model | parser

    return RunnableMap({
        "disaster_type": classify_chain,
        "priority_score": score_chain,
        "priority_reason": reason_chain,
        "explanation": explain_chain
    })

chain = build_chain()

def upload_to_assemblyai(filepath):
    headers = {'authorization': ASSEMBLYAI_API_KEY}
    with open(filepath, 'rb') as f:
        response = requests.post(
            'https://api.assemblyai.com/v2/upload',
            headers=headers,
            files={'file': f}
        )
    response.raise_for_status()
    return response.json()['upload_url']

def transcribe_audio(audio_url):
    endpoint = "https://api.assemblyai.com/v2/transcript"
    headers = {
        "authorization": ASSEMBLYAI_API_KEY,
        "content-type": "application/json"
    }
    response = requests.post(endpoint, json={"audio_url": audio_url}, headers=headers)
    transcript_id = response.json()['id']

    polling = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
    while True:
        res = requests.get(polling, headers=headers)
        res.raise_for_status()
        status = res.json()['status']
        if status == 'completed':
            return res.json()['text']
        elif status == 'error':
            raise Exception("Transcription failed.")
        time.sleep(3)

def describe_image(image_path):
    try:
        img = Image.open(image_path).convert("RGB")
        vision_model = genai.GenerativeModel("gemini-1.5-flash")
        response = vision_model.generate_content([
            "Describe this image in a sentence tell it first person as if reporting as an emergency. Only give the description and nothing of your words.",
            img
        ], stream=False)
        return response.text.strip()
    except Exception as e:
        raise Exception(f"Error processing image: {e}")

if __name__ == "__main__":
    print("\nEmergency Intelligence Assistant")
    print("Submit a text, audio (.wav/.mp3), or image (.jpg/.png) report.")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("🔹 Input (text or file path): ").strip()
        if user_input.lower() in ["exit", "quit"]:
            print("Goodbye. Stay safe!")
            break

        if os.path.isfile(user_input):
            ext = os.path.splitext(user_input)[-1].lower()
            try:
                if ext in ['.jpg', '.jpeg', '.png']:
                    print(" Processing image...")
                    text = describe_image(user_input)
                    print(" Extracted Description:", text)

                elif ext in ['.wav', '.mp3']:
                    print(" Transcribing audio...")
                    audio_url = upload_to_assemblyai(user_input)
                    text = transcribe_audio(audio_url)
                    print(" Transcribed Text:", text)

                else:
                    print(" Unsupported file type.")
                    continue

            except Exception as e:
                print(" Error:", e)
                continue
        else:
            text = user_input

        location = input(" Enter location: ").strip()
        print(" Processing...\n")
        result = chain.invoke({"text": text})

        print(" PRIORITIZED SOS REPORT")
        print(f" Location       : {location}")
        print(f" Disaster Type  : {result['disaster_type'].strip()}")
        print(f" Priority Score : {result['priority_score'].strip()}")
        print(f" Reason         : {result['priority_reason'].strip()}")
        print(f" Explanation    : {result['explanation'].strip()}")
        print(f" Timestamp      : {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 50 + "\n")
