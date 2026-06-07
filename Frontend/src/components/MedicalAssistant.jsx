import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, X, MessageCircle, Minimize2, Maximize2, Stethoscope, Heart, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSelector } from 'react-redux';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Updated to use Gemini 2.5 Flash (free version)
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

const VOICE_LANG_CODES = {
  english: "en-US",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  hindi: "hi-IN",
  marathi: "mr-IN",
  gujarati: "gu-IN",
  bengali: "bn-IN",
  tamil: "ta-IN",
  japanese: "ja-JP"
};

const VOICE_NAMES = {
  english: "en-US-Wavenet-D",
  spanish: "es-ES-Wavenet-A",
  french: "fr-FR-Wavenet-A",
  german: "de-DE-Wavenet-A",
  hindi: "hi-IN-Wavenet-A",
  marathi: "mr-IN-Wavenet-A",
  gujarati: "gu-IN-Wavenet-A",
  bengali: "bn-IN-Wavenet-A",
  tamil: "ta-IN-Wavenet-A",
  japanese: "ja-JP-Wavenet-A"
};

const STT_LANG_CODES = {
  english: "en-US",
  spanish: "es-ES",
  french: "fr-FR",
  german: "de-DE",
  hindi: "hi-IN",
  marathi: "mr-IN",
  gujarati: "gu-IN",
  bengali: "bn-IN",
  tamil: "ta-IN",
  japanese: "ja-JP"
};

const MedicalAssistant = forwardRef((props, ref) => {
  const { user } = useSelector((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [language, setLanguage] = useState("english");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    toggleChatbot: () => {
      setIsOpen(!isOpen);
    }
  }));

  const toggleChatbot = () => {
    console.log('Medical Assistant toggle clicked, current state:', isOpen);
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsMinimized(false);
    } else if (!hasShownWelcome) {
      // Show welcome message when first opened
      const welcomeMessages = {
        english: "Hello! I'm Arogya AI, your medical assistant. How can I help you with your health today?",
        hindi: "नमस्ते! मैं आरोग्य AI हूँ, आपका चिकित्सा सहायक। आज मैं आपकी सेहत में कैसे मदद कर सकता हूँ?",
        marathi: "नमस्कार! मी आरोग्य AI आहे, तुमचा वैद्यकीय सहायक. आज मी तुमच्या आरोग्यात कशी मदत करू शकतो?",
        gujarati: "નમસ્તે! હું આરોગ્ય AI છું, તમારો વૈદ્યકીય સહાયક. આજે હું તમારા આરોગ્યમાં કેવી રીતે મદદ કરી શકું?",
        bengali: "নমস্কার! আমি আরোগ্য AI, আপনার চিকিৎসা সহায়ক। আজ আমি আপনার স্বাস্থ্যে কীভাবে সাহায্য করতে পারি?",
        tamil: "வணக்கம்! நான் ஆரோக்ய AI, உங்கள் மருத்துவ உதவியாளர். இன்று உங்கள் ஆரோக்கியத்தில் எவ்வாறு உதவ முடியும்?",
        japanese: "こんにちは！私はアロギャAI、あなたの医療アシスタントです。今日はあなたの健康についてどのようにお手伝いできますか？",
        spanish: "¡Hola! Soy Arogya AI, tu asistente médico. ¿Cómo puedo ayudarte con tu salud hoy?",
        french: "Bonjour ! Je suis Arogya AI, votre assistant médical. Comment puis-je vous aider avec votre santé aujourd'hui ?",
        german: "Hallo! Ich bin Arogya AI, Ihr medizinischer Assistent. Wie kann ich Ihnen heute mit Ihrer Gesundheit helfen?"
      };
      
      const welcomeMessage = welcomeMessages[language] || welcomeMessages.english;
      setChat([{ sender: "bot", text: welcomeMessage }]);
      setHasShownWelcome(true);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        alert("Speech recognition error: " + event.error);
      };
      recognitionInstance.onend = () => setIsListening(false);
      setRecognition(recognitionInstance);
    }
  }, []);

  // Handle keyboard events and click outside for popup
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsMinimized(false);
      }
    };

    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.medical-assistant-popup') && !event.target.closest('.medical-assistant-button')) {
        setIsOpen(false);
        setIsMinimized(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getMedicalReply = async (text) => {
    const languageInstructions = {
      english: "Respond ENTIRELY in English language. Do not use any other language.",
      spanish: "Respond ENTIRELY in Spanish language. Do not use any other language.",
      french: "Respond ENTIRELY in French language. Do not use any other language.",
      german: "Respond ENTIRELY in German language. Do not use any other language.",
      hindi: "Respond ENTIRELY in Hindi language. Do not use any other language. Use Devanagari script.",
      marathi: "Respond ENTIRELY in Marathi language. Do not use any other language. Use Devanagari script.",
      gujarati: "Respond ENTIRELY in Gujarati language. Do not use any other language. Use Gujarati script.",
      bengali: "Respond ENTIRELY in Bengali language. Do not use any other language. Use Bengali script.",
      tamil: "Respond ENTIRELY in Tamil language. Do not use any other language. Use Tamil script.",
      japanese: "Respond ENTIRELY in Japanese language. Do not use any other language. Use Japanese script."
    };

    const userContext = user ? `User is a ${user.role} (${user.name}). ` : "";

    const prompt = `You are Arogya AI, a knowledgeable medical assistant and healthcare companion for CureConnect Healthcare. 

IMPORTANT LANGUAGE REQUIREMENT: ${languageInstructions[language]}

${userContext}

User query: ${text}

Provide helpful medical guidance, health tips, symptom analysis, and general healthcare advice. Always remind users to consult with qualified healthcare professionals for serious medical concerns.

Please respond using markdown formatting with:
- **Bold text** for important points
- Bullet points for lists
- Clear headings for different sections
- Proper spacing for readability
- Medical terminology explained in simple terms

CRITICAL: Your ENTIRE response must be in ${language} language only. Do not mix languages or use English words.

Remember: This is for general health guidance only. Always recommend consulting a doctor for serious symptoms or medical emergencies.`;
    
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ text: prompt }] 
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Check if response has the expected structure
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
        const safetyMessages = {
          english: "I apologize, but I cannot provide a response to that query due to safety guidelines. Please rephrase your health question.",
          hindi: "माफ़ करें, सुरक्षा दिशानिर्देशों के कारण मैं इस प्रश्न का उत्तर नहीं दे सकता। कृपया अपना स्वास्थ्य प्रश्न दोबारा पूछें।",
          marathi: "माफ करा, सुरक्षा मार्गदर्शक तत्त्वांमुळे मी या प्रश्नाचे उत्तर देऊ शकत नाही. कृपया आपला आरोग्य प्रश्न पुन्हा विचारा.",
          gujarati: "માફ કરો, સુરક્ષા માર્ગદર્શિકાઓને કારણે હું આ પ્રશ્નનો જવાબ આપી શકતો નથી. કૃપા કરીને તમારો સ્વાસ્થ્ય પ્રશ્ન ફરીથી પૂછો.",
          bengali: "দুঃখিত, নিরাপত্তা নির্দেশিকার কারণে আমি এই প্রশ্নের উত্তর দিতে পারছি না। অনুগ্রহ করে আপনার স্বাস্থ্য প্রশ্ন আবার জিজ্ঞাসা করুন।",
          tamil: "மன்னிக்கவும், பாதுகாப்பு வழிகாட்டுதல்களின் காரணமாக என்னால் இந்த கேள்விக்கு பதில் அளிக்க முடியவில்லை. தயவுசெய்து உங்கள் சுகாதார கேள்வியை மீண்டும் கேளுங்கள்।",
          japanese: "申し訳ありませんが、安全ガイドラインのため、この質問にお答えできません。健康に関する質問を言い換えてください。",
          spanish: "Lo siento, no puedo proporcionar una respuesta a esa consulta debido a las pautas de seguridad. Por favor, reformule su pregunta de salud.",
          french: "Je m'excuse, mais je ne peux pas fournir de réponse à cette requête en raison des directives de sécurité. Veuillez reformuler votre question de santé.",
          german: "Entschuldigung, ich kann aufgrund von Sicherheitsrichtlinien keine Antwort auf diese Anfrage geben. Bitte formulieren Sie Ihre Gesundheitsfrage neu."
        };
        return safetyMessages[language] || safetyMessages.english;
      } else {
        console.error('Unexpected API response structure:', data);
        throw new Error('Invalid response structure from API');
      }
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      const errorMessages = {
        english: "Sorry, I'm having trouble connecting to the medical AI service. Please check your internet connection and try again.",
        hindi: "माफ़ करें, चिकित्सा AI सेवा से कनेक्ट करने में समस्या हो रही है। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।",
        marathi: "माफ करा, वैद्यकीय AI सेवेशी कनेक्ट होण्यात समस्या येत आहे. कृपया आपले इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.",
        gujarati: "માફ કરો, મેડિકલ AI સેવા સાથે કનેક્ટ કરવામાં સમસ્યા આવી રહી છે. કૃપા કરીને તમારું ઇન્ટરનેટ કનેક્શન તપાસો અને ફરીથી પ્રયાસ કરો.",
        bengali: "দুঃখিত, চিকিৎসা AI সেবার সাথে সংযোগে সমস্যা হচ্ছে। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।",
        tamil: "மன்னிக்கவும், மருத்துவ AI சேவையுடன் இணைப்பதில் சிக்கல் உள்ளது. தயவுசெய்து உங்கள் இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
        japanese: "申し訳ありませんが、医療AIサービスへの接続に問題があります。インターネット接続を確認してもう一度お試しください。",
        spanish: "Lo siento, tengo problemas para conectarme al servicio de IA médica. Por favor, verifique su conexión a internet e inténtelo de nuevo.",
        french: "Désolé, j'ai des problèmes de connexion au service d'IA médicale. Veuillez vérifier votre connexion internet et réessayer.",
        german: "Entschuldigung, ich habe Probleme beim Verbinden mit dem medizinischen KI-Dienst. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut."
      };
      throw new Error(errorMessages[language] || errorMessages.english);
    }
  };

  const speak = async (text) => {
    try {
      setIsSpeaking(true);
      const ttsResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${import.meta.env.VITE_TTS_API_KEY || ''}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: VOICE_LANG_CODES[language],
              name: VOICE_NAMES[language],
            },
            audioConfig: { audioEncoding: "MP3" },
          }),
        },
      );
      const ttsData = await ttsResponse.json();
      if (ttsData?.audioContent) {
        const audio = new Audio("data:audio/mp3;base64," + ttsData.audioContent);
        setCurrentAudio(audio);
        
        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
        };
        
        await audio.play();
      }
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
      setCurrentAudio(null);
    }
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setIsSpeaking(false);
  };

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.lang = STT_LANG_CODES[language];
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) recognition.stop();
  };

  const toggleVoice = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { sender: "user", text: input };
    setChat((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const reply = await getMedicalReply(input);
      const botMessage = { sender: "bot", text: reply };
      setChat((prev) => [...prev, botMessage]);
      await speak(reply);
    } catch (err) {
      console.error(err);
      const errorMessages = {
        english: "Error while processing your request. Please try again.",
        hindi: "आपके अनुरोध को संसाधित करते समय त्रुटि। कृपया पुनः प्रयास करें।",
        marathi: "तुमचा विनंती प्रक्रिया करताना त्रुटी. कृपया पुन्हा प्रयत्न करा.",
        gujarati: "તમારી વિનંતી પ્રક્રિયા કરતી વખતે ભૂલ. કૃપા કરીને ફરીથી પ્રયાસ કરો.",
        bengali: "আপনার অনুরোধ প্রক্রিয়াকরণে ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        tamil: "உங்கள் கோரிக்கையை செயலாக்குவதில் பிழை. தயவுசெய்து மீண்டும் முயற்சி செய்யுங்கள்।",
        japanese: "リクエストの処理中にエラーが発生しました。もう一度お試しください。",
        spanish: "Error al procesar su solicitud. Por favor, inténtelo de nuevo.",
        french: "Erreur lors du traitement de votre demande. Veuillez réessayer.",
        german: "Fehler bei der Bearbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut."
      };
      alert(errorMessages[language] ?? errorMessages.english);
    }
    setInput("");
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) handleSend();
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        onClick={toggleChatbot}
        className="medical-assistant-button fixed bottom-6 right-6 z-50 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group border-2 border-blue-600 sm:bottom-4 sm:right-4"
        style={{ 
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '16px',
          borderRadius: '50%',
          border: '2px solid #2563eb',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          cursor: 'pointer'
        }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        >
          <Stethoscope size={24} className="text-white" />
        </motion.div>
        
        {/* Pulse ring animation */}
        <motion.div
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.7, 0, 0.7]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-blue-400 rounded-full"
        />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Arogya AI Medical Assistant
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
        </div>
      </motion.button>

      {/* Chatbot Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                height: isMinimized ? 50 : 520
              }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="medical-assistant-popup fixed bottom-24 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-blue-200 overflow-hidden max-h-[80vh] sm:right-4 sm:w-80"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Arogya AI</h3>
                    <p className="text-white/80 text-xs">Medical Assistant</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMinimize}
                    className="p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                  >
                    {isMinimized ? (
                      <Maximize2 size={16} className="text-white" />
                    ) : (
                      <Minimize2 size={16} className="text-white" />
                    )}
                  </button>
                  <button
                    onClick={toggleChatbot}
                    className="p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              {!isMinimized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="h-[440px] flex flex-col"
                >
                  {/* Language Selector */}
                  <div className="p-3 border-b bg-gray-50">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="english">🇺🇸 English</option>
                      <option value="spanish">🇪🇸 Spanish</option>
                      <option value="french">🇫🇷 French</option>
                      <option value="german">🇩🇪 German</option>
                      <option value="hindi">🇮🇳 Hindi</option>
                      <option value="marathi">🇮🇳 Marathi</option>
                      <option value="gujarati">🇮🇳 Gujarati</option>
                      <option value="bengali">🇮🇳 Bengali</option>
                      <option value="tamil">🇮🇳 Tamil</option>
                      <option value="japanese">🇯🇵 Japanese</option>
                    </select>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
                    {chat.length === 0 && (
                      <div className="text-center py-8">
                        <div className="flex justify-center mb-4">
                          <div className="p-4 bg-blue-100 rounded-full">
                            <Heart className="w-8 h-8 text-blue-500" />
                          </div>
                        </div>
                        <h4 className="font-semibold text-gray-700 text-lg mb-2">Arogya AI Medical Assistant</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Ask about symptoms, health tips, medications, or general medical questions.
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>💡 <strong>Remember:</strong> This is for general guidance only.</p>
                          <p>🏥 Always consult a doctor for serious symptoms.</p>
                          <p>🎤 Use voice chat for hands-free interaction.</p>
                        </div>
                      </div>
                    )}

                    {chat.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] p-3 rounded-lg ${
                          msg.sender === "user" 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          <div className="text-xs font-medium mb-2 opacity-70">
                            {msg.sender === "user" ? "You" : "Arogya AI"}
                          </div>
                          <div className="text-sm">
                            {msg.sender === "user" ? (
                              msg.text
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.text}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            Analyzing your query...
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 pb-6 border-t bg-gray-50">
                    <div className="flex gap-2 mb-3">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ask about your health, symptoms, medications, treatments..."
                        disabled={loading || isListening}
                      />
                      <button 
                        onClick={handleSend} 
                        disabled={loading || !input.trim()} 
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {loading ? "..." : "Send"}
                      </button>
                    </div>
                    
                    {/* Voice Button */}
                    <div className="flex justify-center mb-2">
                      <button
                        onClick={toggleVoice}
                        disabled={loading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                          isListening 
                            ? "bg-red-500 text-white animate-pulse shadow-lg" 
                            : isSpeaking
                            ? "bg-green-500 text-white animate-pulse shadow-lg"
                            : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md"
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff size={18} />
                            <span className="text-sm font-medium">Stop Listening</span>
                          </>
                        ) : isSpeaking ? (
                          <>
                            <Volume2 size={18} />
                            <span className="text-sm font-medium">Stop Speaking</span>
                          </>
                        ) : (
                          <>
                            <Mic size={18} />
                            <span className="text-sm font-medium">Voice Chat</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Status Messages */}
                    {isListening && (
                      <p className="text-xs text-red-600 mt-2 mb-2 text-center">🎤 Listening... Speak your health question now!</p>
                    )}
                    {isSpeaking && (
                      <p className="text-xs text-green-600 mt-2 mb-2 text-center">🔊 Speaking response...</p>
                    )}
                    {!(typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) && (
                      <p className="text-xs text-gray-500 mt-2 mb-2 text-center">Voice input not supported in this browser</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Minimized State */}
              {isMinimized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-12 flex items-center justify-center bg-blue-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Stethoscope className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-blue-700 text-sm font-medium">Arogya AI Ready</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </motion.div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

MedicalAssistant.displayName = 'MedicalAssistant';

export default MedicalAssistant;