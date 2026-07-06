import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Play, 
  Edit3, 
  Code, 
  AlignLeft, 
  CheckSquare, 
  Minus,
  Save,
  Wand2,
  Copy,
  Check,
  BarChart2,
  Calendar,
  Lock,
  Unlock,
  KeyRound,
  Plus
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

// Initialize Cloud Database (Serverless Storage)
let app, auth, db, appId;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (e) {
  console.warn("Cloud config not found. Storage will be disabled.", e);
}

export default function App() {
  const [viewMode, setViewMode] = useState('create'); // 'create', 'take', or 'dashboard'
  const [questions, setQuestions] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [user, setUser] = useState(null);
  const [pastScores, setPastScores] = useState([]);
  const [isDashboardUnlocked, setIsDashboardUnlocked] = useState(false);

  // Setup Anonymous Auth Session
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch Past Scores from Database
  useEffect(() => {
    if (!user || !db) return;
    
    const scoresRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scores');
    const unsubscribe = onSnapshot(scoresRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort newest to oldest
      data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setPastScores(data);
    }, (error) => {
      console.error("Error fetching scores", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Method to save score after submission
  const saveScore = async (scoreData) => {
    if (!user || !db) return;
    try {
      const scoresRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scores');
      await addDoc(scoresRef, {
        ...scoreData,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        date: new Date().toLocaleDateString()
      });
    } catch (error) {
      console.error("Error saving score", error);
    }
  };

  // Method to add manual custom score
  const addManualScore = async (dateStr, obtained, total) => {
    if (!user || !db) return;
    try {
      const scoresRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scores');
      const [year, month, day] = dateStr.split('-');
      const dateObj = new Date(year, month - 1, day);
      
      await addDoc(scoresRef, {
        score: Math.round((obtained / total) * 100),
        totalQuestions: total,
        answeredQuestions: obtained,
        timestamp: dateObj.getTime(),
        createdAt: serverTimestamp(),
        date: dateObj.toLocaleDateString(),
        isManual: true
      });
    } catch (error) {
      console.error("Error saving manual score", error);
    }
  };

  // Method to delete a score record
  const deleteScore = async (scoreId) => {
    if (!user || !db) return;
    try {
      const scoreDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'scores', scoreId);
      await deleteDoc(scoreDocRef);
    } catch (error) {
      console.error("Error deleting score", error);
    }
  };

  const addQuestion = (type) => {
    const newQuestion = {
      id: crypto.randomUUID(),
      type: type,
      prompt: '',
      options: type === 'MCQ' ? ['Option A', 'Option B'] : [],
      required: true,
    };
    setQuestions([...questions, newQuestion]);
  };

  const bulkAddQuestions = (newQuestions) => {
    setQuestions([...questions, ...newQuestions]);
  };

  const updateQuestion = (id, updatedFields) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updatedFields } : q));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 text-slate-800 font-sans selection:bg-indigo-100 pb-12">
      <nav className="bg-white/70 backdrop-blur-md border-b border-slate-200/50 shadow-sm sticky top-0 z-20 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-600">
            <CheckSquare size={24} />
            <h1 className="text-xl font-bold tracking-tight">AssessBase AI</h1>
          </div>
          <div className="flex space-x-3 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setViewMode('create')}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
                viewMode === 'create' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Edit3 size={18} />
              <span className="hidden sm:inline">Creator Mode</span>
            </button>
            <button
              onClick={() => {
                setViewMode('take');
                setIsSubmitted(false);
              }}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
                viewMode === 'take' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'
              }`}
            >
              <Play size={18} />
              <span className="hidden sm:inline">Preview / Take</span>
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-md font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
                viewMode === 'dashboard' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart2 size={18} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {viewMode === 'create' && (
          <CreatorMode 
            questions={questions} 
            addQuestion={addQuestion} 
            bulkAddQuestions={bulkAddQuestions}
            updateQuestion={updateQuestion} 
            deleteQuestion={deleteQuestion} 
          />
        )}
        {viewMode === 'take' && (
          <StudentMode 
            questions={questions} 
            isSubmitted={isSubmitted}
            setIsSubmitted={setIsSubmitted}
            saveScore={saveScore}
          />
        )}
        {viewMode === 'dashboard' && (
          <Dashboard 
            pastScores={pastScores} 
            isUnlocked={isDashboardUnlocked}
            setIsUnlocked={setIsDashboardUnlocked}
            addManualScore={addManualScore}
            deleteScore={deleteScore}
          />
        )}
      </main>
    </div>
  );
}

function CreatorMode({ questions, addQuestion, bulkAddQuestions, updateQuestion, deleteQuestion }) {
  const [smartPasteText, setSmartPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');

  const handleSmartAnalyze = () => {
    if (!smartPasteText.trim()) return;

    const startIndex = smartPasteText.search(/\bQ1\b/);
    const relevantText = startIndex >= 0 ? smartPasteText.substring(startIndex) : smartPasteText;

    const blocks = relevantText
      .split(/(?=\bQ\d+\b)/)
      .map(b => b.trim())
      .filter(b => /^Q\d+\b/.test(b));

    const parsedQuestions = blocks.map(block => {
      const optRegex = /^[A-E][\)\.]\s+(.*)/gm;
      const options = [];
      let match;
      while ((match = optRegex.exec(block)) !== null) {
        options.push(match[1].trim());
      }

      let prompt = block;
      if (options.length > 0) {
        const firstOptIndex = block.search(/\n[A-E][\)\.]\s+/);
        if (firstOptIndex !== -1) {
          prompt = block.substring(0, firstOptIndex).trim();
        }
      }

      prompt = prompt.replace(/\nSection [A-Z].*/g, '').trim();

      let type = 'TEXT'; 
      const promptLower = prompt.toLowerCase();
      
      if (options.length > 0) {
        type = 'MCQ';
      } else if (
        promptLower.includes('predict the output') || 
        promptLower.includes('write sql query') || 
        promptLower.includes('code trace') || 
        promptLower.includes('snippet') ||
        promptLower.includes('int[]') 
      ) {
        type = 'CODE';
      } else if (
        promptLower.includes('fill-in-the-blank') || 
        promptLower.includes('fill up') || 
        /\[\d+\]/.test(prompt) || 
        /___/.test(prompt)
      ) {
        type = 'FILLUP';
      }

      return {
        id: crypto.randomUUID(),
        type: type,
        prompt: prompt,
        options: options,
        required: true
      };
    });

    if (parsedQuestions.length > 0) {
      bulkAddQuestions(parsedQuestions);
      setSmartPasteText(''); 
      setPasteError('');
    } else {
      setPasteError("No valid questions found. Make sure questions start with Q1, Q2, etc.");
    }
  };

  const btnSecondaryClass = "px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 flex items-center";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm relative">
        <div className="flex items-center space-x-2 mb-3 text-indigo-800">
          <Wand2 size={20} />
          <h2 className="text-xl font-semibold">Smart Paste / Auto-Analyze</h2>
        </div>
        <p className="text-sm text-indigo-700/80 mb-4">
          Paste your raw text block below. The system will automatically detect question types (MCQs, Fill-in-the-blanks, Code Trace, etc.) based on numbering (Q1, Q2) and options (A), B)).
        </p>
        <textarea
          value={smartPasteText}
          onChange={(e) => {
            setSmartPasteText(e.target.value);
            if(pasteError) setPasteError('');
          }}
          placeholder="Paste text here... e.g.,&#10;Q1 (2 Marks): MCQ&#10;What is...&#10;A) Opt 1&#10;B) Opt 2"
          className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono h-32 resize-y ${pasteError ? 'border-red-400 bg-red-50' : 'border-indigo-200'}`}
        />
        {pasteError && <p className="text-red-500 text-xs mt-2 font-medium">{pasteError}</p>}
        <div className="mt-3 flex justify-end">
          <button 
            onClick={handleSmartAnalyze}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md font-medium transition-colors flex items-center space-x-2 text-sm shadow-sm"
          >
            <Wand2 size={16} />
            <span>Analyze & Generate</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
        <h2 className="text-lg font-medium text-slate-700 mb-4">Or Add Questions Manually</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => addQuestion('MCQ')} className={btnSecondaryClass}>
            <PlusCircle size={16} className="mr-2" /> Multiple Choice
          </button>
          <button onClick={() => addQuestion('FILLUP')} className={btnSecondaryClass}>
            <PlusCircle size={16} className="mr-2" /> Fill in the Blanks
          </button>
          <button onClick={() => addQuestion('TEXT')} className={btnSecondaryClass}>
            <AlignLeft size={16} className="mr-2" /> Text Area
          </button>
          <button onClick={() => addQuestion('CODE')} className={btnSecondaryClass}>
            <Code size={16} className="mr-2" /> Code Editor
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {questions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            No questions added yet. Use Smart Paste or Manual Entry above!
          </div>
        ) : (
          questions.map((q, index) => (
            <QuestionEditor 
              key={q.id} 
              index={index} 
              question={q} 
              updateQuestion={updateQuestion} 
              deleteQuestion={deleteQuestion} 
            />
          ))
        )}
      </div>
    </div>
  );
}

function QuestionEditor({ index, question, updateQuestion, deleteQuestion }) {
  const handleOptionChange = (optIndex, value) => {
    const newOptions = [...question.options];
    newOptions[optIndex] = value;
    updateQuestion(question.id, { options: newOptions });
  };

  const addOption = () => {
    updateQuestion(question.id, { options: [...question.options, `Option ${question.options.length + 1}`] });
  };

  const removeOption = (optIndex) => {
    const newOptions = question.options.filter((_, i) => i !== optIndex);
    updateQuestion(question.id, { options: newOptions });
  };

  const typeLabels = {
    'MCQ': { label: 'Multiple Choice', color: 'bg-blue-100 text-blue-700' },
    'FILLUP': { label: 'Fill in the Blank', color: 'bg-amber-100 text-amber-700' },
    'TEXT': { label: 'Text Response', color: 'bg-emerald-100 text-emerald-700' },
    'CODE': { label: 'Code Assignment', color: 'bg-purple-100 text-purple-700' }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-500">Q{index + 1}</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${typeLabels[question.type].color}`}>
            {typeLabels[question.type].label}
          </span>
        </div>
        <button 
          onClick={() => deleteQuestion(question.id)}
          className="text-slate-400 hover:text-red-500 transition-colors p-1"
          title="Delete Question"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="block text-sm font-medium text-slate-700">Question Prompt</label>
            {question.type === 'FILLUP' && (
              <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded">
                Tip: Use [1], [2] or ___ for multi-blanks!
              </span>
            )}
          </div>
          <textarea
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-sm"
            rows={question.prompt.split('\n').length > 2 ? Math.min(question.prompt.split('\n').length + 1, 8) : 3}
            value={question.prompt}
            onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
          />
        </div>

        {question.type === 'MCQ' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Options</label>
            {question.options.map((opt, oIndex) => (
              <div key={oIndex} className="flex items-center space-x-2">
                <div className="w-6 flex justify-center"><div className="w-4 h-4 rounded-full border-2 border-slate-300"></div></div>
                <input
                  type="text"
                  className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                  value={opt}
                  onChange={(e) => handleOptionChange(oIndex, e.target.value)}
                />
                <button 
                  onClick={() => removeOption(oIndex)}
                  disabled={question.options.length <= 2}
                  className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 p-2"
                >
                  <Minus size={18} />
                </button>
              </div>
            ))}
            <button onClick={addOption} className="text-sm text-indigo-600 font-medium flex items-center hover:text-indigo-700 mt-2 pl-8">
              <PlusCircle size={16} className="mr-1" /> Add Option
            </button>
          </div>
        )}

        {question.type === 'CODE' && (
          <div className="bg-slate-900 rounded-lg p-4 text-slate-300 font-mono text-sm opacity-80 pointer-events-none">
            {`// Code editor preview area\nfunction solution() {\n  // student code goes here\n}`}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentMode({ questions, isSubmitted, setIsSubmitted, saveScore }) {
  const [answers, setAnswers] = useState({});
  const [copied, setCopied] = useState(false);
  const [copyType, setCopyType] = useState('text');
  const [copyError, setCopyError] = useState(false);

  const answeredCount = Object.keys(answers).filter(k => answers[k] && answers[k].trim() !== '').length;
  const progress = questions.length > 0 ? Math.min(100, Math.round((answeredCount / questions.length) * 100)) : 0;

  if (questions.length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-500 mb-4">
          <Edit3 size={32} />
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">No Questions Available</h2>
        <p className="text-slate-500">Please switch to Creator Mode and add/paste some questions first.</p>
      </div>
    );
  }

  const handleAnswerChange = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    if (saveScore) {
      saveScore({
        score: progress,
        totalQuestions: questions.length,
        answeredQuestions: answeredCount
      });
    }
  };

  const generateReportText = () => {
    let report = `=== ASSESSMENT SUBMISSION ===\n\n`;
    questions.forEach((q, i) => {
      const promptSummary = q.prompt.split('\n')[0].substring(0, 100);
      report += `Q${i+1}. ${promptSummary}\n`;
      
      if (q.type === 'FILLUP' && /\[\d+\]|___/.test(q.prompt)) {
         const numBlanks = (q.prompt.match(/\[\d+\]|___/g) || []).length;
         let ansArr = [];
         for(let b = 0; b < numBlanks; b++) {
            ansArr.push(`[Blank ${b+1}]: ${answers[`${q.id}_${b}`] || "No Answer"}`);
         }
         report += `Answer: \n  - ${ansArr.join("\n  - ")}\n`;
      } else {
         const answer = answers[q.id] || "No Answer Provided";
         report += `Answer: ${answer}\n`;
      }
      report += `----------------------------------------\n\n`;
    });
    return report;
  };

  const generateReportHTML = () => {
    let html = `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; color: #1e293b;">`;
    html += `<h2 style="color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 12px; margin-bottom: 24px;">Assessment Submission</h2>`;
    
    questions.forEach((q, i) => {
      const promptSummary = q.prompt.split('\n')[0].substring(0, 100);
      html += `<div style="margin-bottom: 20px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">`;
      html += `<h3 style="margin-top: 0; margin-bottom: 16px; font-size: 16px; color: #0f172a;">Q${i+1}. ${promptSummary}</h3>`;
      
      if (q.type === 'FILLUP' && /\[\d+\]|___/.test(q.prompt)) {
         const numBlanks = (q.prompt.match(/\[\d+\]|___/g) || []).length;
         html += `<ul style="margin: 0; padding-left: 20px; color: #334155;">`;
         for(let b = 0; b < numBlanks; b++) {
            const ans = answers[`${q.id}_${b}`] || "<em>No Answer</em>";
            html += `<li style="margin-bottom: 8px;"><strong>Blank ${b+1}:</strong> <span style="color: #4f46e5; font-weight: 500;">${ans}</span></li>`;
         }
         html += `</ul>`;
      } else {
         const answer = answers[q.id] || "<em>No Answer Provided</em>";
         html += `<div style="background: #ffffff; padding: 12px 16px; border-left: 4px solid #4f46e5; border-radius: 6px; color: #334155;"><strong>Answer:</strong> <span style="color: #4f46e5; font-weight: 500;">${answer}</span></div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  };

  const copyReport = (format = 'text') => {
    const text = format === 'html' ? generateReportHTML() : generateReportText();
    setCopyType(format);
    
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
    
    document.body.removeChild(textArea);
  };

  if (isSubmitted) {
    const reportText = generateReportText();
    
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
        <div className="bg-white/80 backdrop-blur-sm p-10 rounded-2xl shadow-lg shadow-indigo-100/50 text-center border border-white relative">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 text-green-600 mb-6 shadow-inner transform transition-transform hover:scale-110 duration-300">
            <CheckSquare size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Assessment Completed</h2>
          <p className="text-slate-600 mb-8">Your responses have been recorded successfully. You can copy the results below to verify them with an external grading tool.</p>
          
          <button 
            onClick={() => { setIsSubmitted(false); setAnswers({}); }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Retake Assessment
          </button>
        </div>

        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative">
          {copyError && (
            <div className="absolute top-14 left-0 w-full bg-red-500 text-white text-xs text-center py-1 font-medium z-10 animate-in slide-in-from-top-2">
              Unable to copy automatically. Please copy the text below manually.
            </div>
          )}
          <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center backdrop-blur-sm gap-3">
            <span className="text-sm font-mono text-slate-300">submission_results</span>
            <div className="flex space-x-2">
              <button 
                onClick={() => copyReport('text')}
                className="text-slate-300 hover:text-white flex items-center space-x-1 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition text-xs font-medium"
              >
                {copied && copyType === 'text' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>{copied && copyType === 'text' ? 'Copied Text!' : 'Copy as Text'}</span>
              </button>
              <button 
                onClick={() => copyReport('html')}
                className="text-indigo-200 hover:text-white flex items-center space-x-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 px-3 py-1.5 rounded-md transition text-xs font-medium"
              >
                {copied && copyType === 'html' ? <Check size={14} className="text-green-400" /> : <Code size={14} />}
                <span>{copied && copyType === 'html' ? 'Copied HTML!' : 'Copy as HTML'}</span>
              </button>
            </div>
          </div>
          <div className="p-4 overflow-x-auto max-h-96 overflow-y-auto">
            <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap leading-relaxed selection:bg-green-400/30">
              {reportText}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-1.5 bg-slate-100 w-full">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Final Assessment</h2>
            <p className="text-slate-500">Please answer all questions below to the best of your ability.</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold border border-indigo-100 shadow-sm">
              {progress}% Done
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {questions.map((q, index) => {
          const hasInlineBlanks = q.type === 'FILLUP' && /\[\d+\]|___/.test(q.prompt);

          return (
            <div key={q.id} className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200/80 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <h3 className="text-base font-medium text-slate-800 mb-4 flex items-start">
                <span className="text-indigo-500 font-bold mr-3 mt-1">Q{index + 1}.</span> 
                
                {hasInlineBlanks ? (
                  <span className="whitespace-pre-wrap font-mono text-sm leading-relaxed block flex-1">
                    {(() => {
                      const parts = q.prompt.split(/(\[\d+\]|___)/g);
                      let blankCounter = 0;
                      return parts.map((part, pIndex) => {
                        if (part.match(/\[\d+\]|___/)) {
                          const currentBlank = blankCounter++;
                          return (
                            <input
                              key={pIndex}
                              type="text"
                              className="mx-1 inline-block w-24 px-2 py-0.5 border-b-2 border-indigo-300 bg-indigo-50/50 focus:bg-indigo-50 focus:outline-none focus:border-indigo-600 transition-all text-center font-bold text-indigo-900 shadow-inner rounded-t-sm"
                              onChange={(e) => handleAnswerChange(`${q.id}_${currentBlank}`, e.target.value)}
                              placeholder={part}
                              required={q.required}
                            />
                          );
                        }
                        return <span key={pIndex}>{part}</span>;
                      });
                    })()}
                  </span>
                ) : (
                  <span className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{q.prompt || "Untitled Question"}</span>
                )}
              </h3>

              {!hasInlineBlanks && (
                <div className="ml-8 mt-2">
                  {q.type === 'MCQ' && (
                    <div className="space-y-3">
                      {q.options.map((opt, oIndex) => (
                        <label key={oIndex} className="flex items-start space-x-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name={`question-${q.id}`}
                            value={opt}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            required={q.required}
                            className="mt-1 w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-slate-700 font-medium text-sm group-hover:text-indigo-900 transition-colors">{opt || `Option ${oIndex + 1}`}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'FILLUP' && (
                    <input
                      type="text"
                      required={q.required}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full max-w-md p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    />
                  )}

                  {q.type === 'TEXT' && (
                    <textarea
                      required={q.required}
                      rows="4"
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Write your detailed response here..."
                      className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow resize-y"
                    ></textarea>
                  )}

                  {q.type === 'CODE' && (
                    <div className="relative group">
                      <div className="absolute top-0 right-0 bg-slate-800 text-xs text-slate-400 px-3 py-1 rounded-bl-lg rounded-tr-lg border-b border-l border-slate-700 font-mono">
                        Code Editor
                      </div>
                      <textarea
                        required={q.required}
                        rows="8"
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="// Write your code here...&#10;function solve() {&#10;&#10;}"
                        className="w-full p-4 pt-8 bg-[#1e1e2e] text-indigo-100 font-mono text-sm rounded-lg border border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-y selection:bg-indigo-500/30"
                        spellCheck="false"
                      ></textarea>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t border-slate-200/60 flex justify-end">
          <button 
            type="submit"
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center space-x-2"
          >
            <Save size={18} />
            <span>Submit Assessment</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function Dashboard({ pastScores, isUnlocked, setIsUnlocked, addManualScore, deleteScore }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualObtained, setManualObtained] = useState('');
  const [manualTotal, setManualTotal] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '0089') {
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualObtained && manualTotal) {
      addManualScore(manualDate, Number(manualObtained), Number(manualTotal));
      setShowManualForm(false);
      setManualObtained('');
      setManualTotal('');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-12 animate-in zoom-in-95 duration-500">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-slate-200/60 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-500 mb-6 shadow-inner">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Dashboard Locked</h2>
          <p className="text-slate-500 mb-6 text-sm">Please enter the password to view and manage your test scores.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className={`w-full p-3 border rounded-lg focus:ring-2 outline-none transition-all text-center tracking-widest ${
                  error ? 'border-red-400 focus:ring-red-500 bg-red-50' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              {error && <p className="text-red-500 text-xs mt-2 font-medium animate-bounce">Incorrect password.</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <Unlock size={18} />
              <span>Access Dashboard</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200/60 text-center mb-6 relative">
        <button 
          onClick={() => setIsUnlocked(false)} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 flex items-center space-x-1 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors"
        >
          <Lock size={14} /> <span>Lock</span>
        </button>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 shadow-inner">
          <BarChart2 size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Progress Dashboard</h2>
        <p className="text-slate-500">Track your everyday assessment completion scores and test history.</p>
      </div>

      <div className="mb-8">
        {!showManualForm ? (
          <button 
            onClick={() => setShowManualForm(true)}
            className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex justify-center items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Manual Score</span>
          </button>
        ) : (
          <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2">
            <h3 className="font-semibold text-indigo-800 mb-4 flex items-center">
              <Edit3 size={18} className="mr-2" /> Add Previous Result
            </h3>
            <form onSubmit={handleManualSubmit} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full p-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Marks Obtained</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  placeholder="e.g. 75"
                  value={manualObtained}
                  onChange={(e) => setManualObtained(e.target.value)}
                  className="w-full p-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Total Marks</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  placeholder="e.g. 100"
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  className="w-full p-2.5 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex space-x-2 w-full md:w-auto">
                <button type="button" onClick={() => setShowManualForm(false)} className="px-4 py-2.5 text-slate-500 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                  Save
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {pastScores.length === 0 ? (
          <div className="text-center py-12 bg-white/60 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">No assessments completed yet.</p>
            <p className="text-sm text-slate-400 mt-1">Take a test or add a manual score to see your history here!</p>
          </div>
        ) : (
          pastScores.map((scoreObj, i) => (
            <div key={scoreObj.id || i} className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="flex items-center space-x-4">
                <div className={`border p-3 rounded-xl shadow-sm ${scoreObj.isManual ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-slate-50 border-slate-200 text-indigo-500'}`}>
                  {scoreObj.isManual ? <KeyRound size={24} /> : <Calendar size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center space-x-2">
                    <span>{scoreObj.date}</span>
                    {!scoreObj.isManual && (
                      <span className="text-sm font-normal text-slate-400">
                        ({new Date(scoreObj.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                      </span>
                    )}
                    {scoreObj.isManual && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium ml-2">Manual Entry</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {scoreObj.isManual ? `Scored ${scoreObj.answeredQuestions} out of ${scoreObj.totalQuestions} marks` : `Answered ${scoreObj.answeredQuestions} out of ${scoreObj.totalQuestions} questions`}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-600">
                    {scoreObj.score}%
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Completion
                  </div>
                </div>
                {scoreObj.id && (
                  <button 
                    onClick={() => deleteScore(scoreObj.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete this record"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}