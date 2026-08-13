import os
import json
import logging
from dotenv import load_dotenv
from typing import Dict, Any, Optional, List, Union
from groq import Groq

load_dotenv()

logger = logging.getLogger(__name__)

class MalwareAnalysisChatbot:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("API_KEY_CHAT") or os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
        self.model = "llama3-70b-8192"

    def _ensure_client(self):
        if not self.client:
            key = self.api_key or os.getenv("API_KEY_CHAT") or os.getenv("GROQ_API_KEY")
            if not key:
                raise ValueError("API_KEY_CHAT environment variable not set.")
            self.client = Groq(api_key=key)

    def generate_report_from_json(self, json_data: Union[Dict, str]) -> str:
        if isinstance(json_data, dict):
            json_data = json.dumps(json_data, indent=2)
        
        prompt = f"""You are a cybersecurity expert specializing in malware analysis. You've been provided with a JSON report 
containing analysis data about a potentially malicious file. Generate a comprehensive, human-readable report 
based on this data.

The report should be structured, clearly explaining the findings and providing a risk assessment. 
Include recommendations based on the threat level detected.

JSON Analysis Data:
{json_data}

Format your response as a structured report with the following sections:
1. Summary of Findings
2. Technical Details
3. Risk Assessment
4. Recommendations

Be specific and refer to actual data points from the JSON analysis."""

        try:
            self._ensure_client()
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=4096
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return f"Error generating report: {str(e)}"
    
    def ask(self, question: str) -> str:
        prompt = f"""You are a cybersecurity analyst specializing in malware detection and analysis. 
Provide accurate, helpful information about malware, security threats, and best practices for protection.

If asked about specific file analysis, explain that you need the analysis JSON data to provide detailed insights.

User question: {question}

Answer in a clear, helpful, and informative manner. If the question is outside your expertise, acknowledge 
your limitations and suggest appropriate resources or alternative approaches."""

        try:
            self._ensure_client()
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=4096
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error processing question: {e}")
            return f"Error processing your question: {str(e)}"


class JSONReportChatbot:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("API_KEY_CHAT") or os.environ.get("GROQ_API_KEY")
        self.base_chatbot = MalwareAnalysisChatbot(api_key=self.api_key)
        self.client = self.base_chatbot.client
        self.model = self.base_chatbot.model

    def analyze_json_report(self, json_data: Union[Dict, str]) -> Dict[str, Any]:
        if isinstance(json_data, dict):
            json_data_str = json.dumps(json_data, indent=2)
        else:
            json_data_str = json_data

        prompt = f"""You are a cybersecurity expert analyzing malware detection results.

Analyze the following JSON malware analysis report and provide a structured assessment.

{json_data_str}

Respond ONLY with a valid JSON object in the following exact format (no markdown, no extra text):
{{
  "summary": "A brief summary of the malware analysis findings",
  "threat_level": "Low|Medium|High|Critical",
  "key_indicators": ["indicator1", "indicator2"],
  "recommendations": ["recommendation1", "recommendation2"]
}}"""

        try:
            self.base_chatbot._ensure_client()
            response = self.base_chatbot.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1024
            )
            content = response.choices[0].message.content.strip()
            # Strip markdown code fences if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content)
        except json.JSONDecodeError:
            return {
                "summary": "Analysis complete - see report for details",
                "threat_level": "Unknown",
                "key_indicators": ["Could not parse structured response"],
                "recommendations": ["Review the full report for details"]
            }
        except Exception as e:
            logger.error(f"Error analyzing JSON report: {e}")
            return {
                "error": str(e),
                "summary": "Error analyzing report",
                "threat_level": "Unknown",
                "key_indicators": ["Analysis failed"],
                "recommendations": ["Retry analysis or contact support"]
            }
    
    def generate_report(self, json_data: Union[Dict, str]) -> str:
        return self.base_chatbot.generate_report_from_json(json_data)
    
    def ask(self, question: str) -> str:
        return self.base_chatbot.ask(question)
