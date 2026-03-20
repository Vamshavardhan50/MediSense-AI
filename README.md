# 🏥 MediSense AI
### *"Your Medical Chaos, Organized and Life-Ready"*

![MediSense AI](https://img.shields.io/badge/MediSense-AI-blue?style=for-the-badge&logo=google)
![Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash-orange?style=for-the-badge&logo=google)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-yellow?style=for-the-badge&logo=firebase)
![Cloud Run](https://img.shields.io/badge/Google-Cloud%20Run-blue?style=for-the-badge&logo=googlecloud)
![Python](https://img.shields.io/badge/Python-3.11-green?style=for-the-badge&logo=python)
![Streamlit](https://img.shields.io/badge/Streamlit-1.32-red?style=for-the-badge&logo=streamlit)

---

## 🌐 Live Demo
👉 https://medisense-ai-113931364052.us-west1.run.app

Click "Try Demo Mode" on the sidebar to explore instantly.

---

## 🚨 Problem Statement

Medical information today is **fragmented, confusing, and inaccessible** — leading to serious health risks.

### Key Problems:
- 💊 Medication confusion (elderly patients)
- 📝 Illegible prescriptions
- 🚨 No emergency medical data
- 🌍 Language barriers
- 🔬 Lab report confusion
- ⚠️ Drug interaction risks
- 😰 Symptom panic & wrong decisions

---

## 💡 Our Solution

**MediSense AI** transforms messy medical inputs into structured, actionable insights.

```
MESSY INPUT → AI PROCESSING → LIFE-SAVING OUTPUT
```

- 📸 Prescription → Clean medication list
- 🎤 Voice → Structured profile
- 📄 Lab reports → Simple explanation
- 🌍 Any language → Translated medical info
- 💊 Medications → Interaction alerts
- 😰 Symptoms → Emergency triage

---

## 🚀 Features

### Core Features

#### 📄 Smart Prescription Reader
- Extracts meds, dosage, frequency
- Works on handwritten prescriptions

#### 🎤 Voice Medical History
- Converts casual speech into structured data

#### 🆘 Emergency QR Card
- Instant access to medical profile
- Works even if unconscious

#### ⚠️ Drug Interaction Checker
- Detects dangerous combinations

#### 🩺 Symptom Triage
- Emergency classification:
  - 🔴 Emergency
  - 🟡 Urgent
  - 🟢 Routine
  - 🔵 Monitor

---

### Advanced Features
- 🔬 Lab Report Translator
- 🌍 Multi-language Support
- ⏰ Smart Medication Schedule
- 💊 Pill Identifier
- 👨‍👩‍👧 Family Dashboard

---

## ⚙️ How It Works

1. **Input**
   - Photo / Voice / Text / PDF / Any language

2. **AI Processing**
   - Gemini extracts + validates data

3. **Output**
   - Structured insights + alerts + actions

---

## 🛠️ Tech Stack

### Core
- Google Gemini 2.0 Flash
- Firebase (Firestore, Auth, Storage)
- Google Cloud Run
- Python 3.11
- Streamlit

### Libraries
```txt
streamlit
google-generativeai
firebase-admin
Pillow
python-dotenv
qrcode
pandas
fpdf2
```

---

## 🏗️ Architecture

```
User → Streamlit → Backend → Gemini API
                     → Firebase
```

---

## 🔄 Workflow

### Example: Prescription Upload
1. Upload image  
2. AI extracts data  
3. Validate medications  
4. Check interactions  
5. Save to database  
6. Update profile  

---

## 📦 Installation

```bash
git clone https://github.com/yourusername/medisense-ai.git
cd medisense-ai

python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows

pip install -r requirements.txt
cp .env.example .env

streamlit run app.py
```

---

## 🔑 Environment Variables

```
GEMINI_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
```

---

## 🚀 Deployment (Cloud Run)

```bash
gcloud run deploy medisense-ai \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated
```

---

## 📚 API Overview

### Analyze Document
```python
analyze_medical_document(image_path)
```

### Voice Processing
```python
process_voice_input(text)
```

### Drug Interaction
```python
check_drug_interactions(medications)
```

### Symptom Triage
```python
assess_symptom_urgency(symptoms)
```

---

## 🗄️ Database Schema

```
users/{uid}
 ├── profile
 ├── medications
 ├── allergies
 ├── conditions
 └── emergency_card
```

---

## 🔒 Security

- Environment-based secrets
- HTTPS enforced
- Input validation
- Firebase security rules
- No PII logging

---

## 🧪 Testing

```bash
pytest tests/
```

---

## 🔮 Future Enhancements

- 📱 Mobile App
- ⌚ Smartwatch support
- 🏥 Hospital integration
- 🤖 Predictive alerts
- 🌍 Global expansion

---

## 📋 Version History

### v2.0
- Gemini 2.0 upgrade
- Firebase integration
- 10 features
- Cloud deployment

### v1.0
- Basic prototype

---

## ⚕️ Medical Disclaimer

This app is **not a substitute for professional medical advice**.

Always consult a doctor.  
In emergencies, call emergency services immediately.

---

## 🤝 Contributing

```bash
git checkout -b feature/new-feature
git commit -m "Add feature"
git push origin feature/new-feature
```

---

## 📄 License

MIT License

---

## 📞 Contact

- 🌐 Demo: https://medisense-ai-113931364052.us-west1.run.app
- 📧 Email: chintha.vamshavardhan50@gmail.com
- 🐙 GitHub: https://github.com/Vamshavardhan50/MediSense-AI/

---

<div align="center">

**🏥 MediSense AI**  
Transforming Medical Chaos into Life-Saving Clarity

</div>
