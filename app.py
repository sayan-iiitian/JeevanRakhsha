import os
import time
import requests
from PIL import Image
import streamlit as st
import sounddevice as sd
import scipy.io.wavfile
import google.generativeai as genai
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.schema.runnable import RunnableMap
from langchain_google_genai import ChatGoogleGenerativeAI
import wave
import lameenc
import numpy as np

load_dotenv()
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
genai.configure(api_key=GOOGLE_API_KEY)

prompt1 = PromptTemplate(
    input_variables=["text"],
    template=(
        "You are an AI-powered emergency classification assistant.\n"
        "Categorize the following incoming request into one of the following categories: Medical, Food/Water, Shelter, Evacuation.\n"
        "Use NLP understanding and prioritize based on urgency-related keywords like 'bleeding', 'injured', 'no food', 'trapped', etc.\n"
        "Text: {text}\n"
        "Category:"
    )
)

prompt2 = PromptTemplate(
    input_variables=["text"],
    # template="Provide a short explanation about why the text fits the selected category: {text}"
    template = "You are a compassionate AI support assistant.\n"
        "Read the emergency report below and explain in a caring and empathetic tone why it was categorized as it was.\n"
        "Make sure your response reflects urgency and concern for the person's safety.\n"
        "Report: {text}\n"
        "Explanation:"
)

model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", 
    temperature=0.2
    )
parser = StrOutputParser()

def build_chain():
    classify = prompt1 | model | parser
    explain = prompt2 | model | parser
    return RunnableMap({"text": classify}) | explain

chain = build_chain()

def upload_to_assemblyai(filepath):
    headers = {'authorization': ASSEMBLYAI_API_KEY}
    with open(filepath, 'rb') as f:
        response = requests.post('https://api.assemblyai.com/v2/upload',
                                 headers=headers,
                                 files={'file': f})
    response.raise_for_status()
    return response.json()['upload_url']

def transcribe_audio(audio_url):
    endpoint = "https://api.assemblyai.com/v2/transcript"
    headers = {"authorization": ASSEMBLYAI_API_KEY, "content-type": "application/json"}
    response = requests.post(endpoint, json={"audio_url": audio_url}, headers=headers)
    transcript_id = response.json()['id']
    polling = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
    while True:
        res = requests.get(polling, headers=headers)
        res.raise_for_status()
        if res.json()['status'] == 'completed':
            return res.json()['text']
        elif res.json()['status'] == 'error':
            raise Exception(" Transcription failed.")
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
    
def wav_to_mp3_lame(wav_path, mp3_path=None):
    with wave.open(wav_path, 'rb') as wf:
        nchannels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        nframes = wf.getnframes()
        audio_data = wf.readframes(nframes)

    if mp3_path is None:
        mp3_path = wav_path.replace(".wav", ".mp3")

    encoder = lameenc.Encoder()
    encoder.set_bit_rate(128)
    encoder.set_in_sample_rate(framerate)
    encoder.set_channels(nchannels)
    encoder.set_quality(2)

    mp3_data = encoder.encode(audio_data)
    mp3_data += encoder.flush()

    with open(mp3_path, "wb") as f:
        f.write(mp3_data)

    print(f"MP3 file saved as: {mp3_path}")
    return mp3_path


def create_empty_wav(path, fs=16000, duration=1):
    """Create a blank WAV file (1 second silence)"""
    empty_data = np.zeros(int(fs * duration), dtype=np.int16)
    scipy.io.wavfile.write(path, fs, empty_data)

def ensure_wav_exists(path, fs=16000, duration=1):
    """Check if file exists; if not, create an empty WAV"""
    if not os.path.exists(path):
        create_empty_wav(path, fs, duration)

def record_and_save(path, fs, duration):
    """Record from microphone and overwrite the WAV file"""
    try:
        st.info(" Recording started...")
        recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
        sd.wait()
        scipy.io.wavfile.write(path, fs, recording)
    except Exception as e:
        st.error(f"Recording failed: {e}")


# Streamlit UI
st.set_page_config(page_title="Disaster Classifier", layout="centered")
st.title(" Disaster Classification Assistant")
st.write("Upload a file or enter text to classify the emergency type and receive an explanation.")
input_mode = st.radio("Select input type:", ("Text", "Image", "Audio", "Microphone"))
if input_mode == "Text":
    user_text = st.text_area("Enter your emergency-related report:")
    if st.button("Classify Text") and user_text:
        with st.spinner("Classifying text..."):
            result = chain.invoke({"text": user_text})
            st.success(" Classification Result:")
            st.write(result.strip())

elif input_mode == "Image":
    uploaded_image = st.file_uploader("Upload an emergency-related image", type=["jpg", "jpeg", "png"])
    if uploaded_image and st.button("Classify Image"):
        with st.spinner("Analyzing image and classifying..."):
            try:
                temp_path = f"temp_{uploaded_image.name}"
                with open(temp_path, "wb") as f:
                    f.write(uploaded_image.read())
                img_text = describe_image(temp_path)
                result = chain.invoke({"text": img_text})
                st.image(temp_path, caption="Uploaded Image", use_column_width=True)
                st.write(" Description:", img_text)
                st.success(" Classification Result:")
                st.write(result.strip())
                os.remove(temp_path)
            except Exception as e:
                st.error(f" Error: {e}")

elif input_mode == "Audio":
    uploaded_audio = st.file_uploader("Upload an emergency-related audio file", type=["mp3", "wav"])
    if uploaded_audio and st.button("Classify Audio"):
        with st.spinner("Transcribing and classifying..."):
            try:
                temp_path = f"temp_{uploaded_audio.name}"
                with open(temp_path, "wb") as f:
                    f.write(uploaded_audio.read()) 
                audio_url = upload_to_assemblyai(temp_path)
                audio_text = transcribe_audio(audio_url)
                result = chain.invoke({"text": audio_text})
                st.audio(temp_path)
                st.write(" Transcription:", audio_text)
                st.success(" Classification Result:")
                st.write(result.strip())
                os.remove(temp_path)
            except Exception as e:
                st.error(f" Error: {e}")

elif input_mode == "Microphone":
    duration = st.slider("Recording duration (seconds):", min_value=3, max_value=20, value=5)
    if st.button("Record and Classify"):
        with st.spinner("Recording and classifying..."):
            try:
                st.info(f" Recording started for {duration} seconds... Please speak now.")
                fs = 16000  
                temp_wav_path = "mic_input.wav"
                temp_mp3_path = "mic_input.mp3"
                if not os.path.exists(temp_wav_path):
                    empty_data = np.zeros(int(fs * 1), dtype=np.int16)
                    scipy.io.wavfile.write(temp_wav_path, fs, empty_data)
                recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
                sd.wait()
                recording_int16 = np.int16(recording * 32767)
                scipy.io.wavfile.write(temp_wav_path, fs, recording_int16)
                st.audio(temp_wav_path)
                temp_mp3_path = wav_to_mp3_lame(temp_wav_path)
                audio_url = upload_to_assemblyai(temp_mp3_path)
                audio_text = transcribe_audio(audio_url)
                result = chain.invoke({"text": audio_text})
                st.write(" Transcription:", audio_text)
                st.success(" Classification Result:")
                st.write(result.strip())
                os.remove(temp_wav_path)
                os.remove(temp_mp3_path)

            except Exception as e:
                st.error(f" Error: {e}")