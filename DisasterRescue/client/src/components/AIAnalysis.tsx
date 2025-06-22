import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, BrainCircuit, ShieldAlert, FileText } from "lucide-react";

interface AIAnalysisProps {
  description: string;
}

interface AnalysisResult {
  disaster_type: string;
  priority_score: number;
  priority_reason: string;
  explanation: string;
}

export function AIAnalysis({ description }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalysis = async () => {
    if (!description.trim()) {
      toast({
        title: "Please enter a description first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnalysis(null);

    try {
      const response = await fetch("http://127.0.0.1:5001/sos_new", { // Assuming Flask runs on 5001
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: description,
          location: "tbd", // Location isn't the primary input for analysis here
        }),
      });

      if (!response.ok) {
        throw new Error(`AI server error: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalysis(data.entry);
      toast({
        title: "AI Analysis Complete",
        description: "The AI has classified and prioritized the situation.",
      });
    } catch (error: any) {
      toast({
        title: "AI Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <BrainCircuit className="h-5 w-5" />
          <span>AI-Powered Situation Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-blue-800">
          Use our AI to analyze the situation description. It will help classify the emergency type and assess its priority before you send the official alert.
        </p>
        <Button onClick={handleAnalysis} disabled={isLoading}>
          <Zap className="h-4 w-4 mr-2" />
          {isLoading ? "Analyzing..." : "Run AI Analysis"}
        </Button>

        {analysis && (
          <div className="space-y-4 pt-4 border-t border-blue-200">
            <h4 className="font-semibold text-lg text-blue-900">Analysis Results:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="h-5 w-5 mt-1 text-blue-600" />
                <div>
                  <p className="font-semibold">Disaster Type:</p>
                  <p className="text-blue-800">{analysis.disaster_type}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Zap className="h-5 w-5 mt-1 text-blue-600" />
                <div>
                  <p className="font-semibold">Priority Score:</p>
                  <p className="text-blue-800">{analysis.priority_score} / 1000</p>
                  <p className="text-xs text-blue-600">{analysis.priority_reason}</p>
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 mt-1 text-blue-600" />
              <div>
                <p className="font-semibold">AI Explanation:</p>
                <p className="text-sm text-blue-800">{analysis.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 