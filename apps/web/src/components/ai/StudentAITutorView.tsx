'use client';

import React, { useState, useEffect } from 'react';
import {
  askStudentTutorAction,
  generateStudentPracticeQuizAction,
  generateStudentRevisionPlanAction,
  getStudentEnrolledSubjectsAction,
} from '@/app/actions/aiActions';
import type { AIQuizOutput } from '@edu-platform/validators';
import {
  Sparkles,
  BookOpen,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  timestamp: string;
  groundedCitation?: string;
}

export function StudentAITutorView() {
  const [mode, setMode] = useState<'chat' | 'quiz' | 'revision'>('chat');
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'tutor',
      text: 'Hello! I am your AI academic tutor. Ask me to explain any concept, help with homework questions, or guide you through difficult problems step-by-step.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [studyNotes, setStudyNotes] = useState('');
  const [showNotesBox, setShowNotesBox] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('');
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizCount, setQuizCount] = useState(5);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<AIQuizOutput | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({});

  // Revision State
  const [examName, setExamName] = useState('');
  const [daysAvailable, setDaysAvailable] = useState(7);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [revisionPlanText, setRevisionPlanText] = useState<string | null>(null);

  // Load enrolled subjects
  useEffect(() => {
    async function loadSubjects() {
      setLoadingSubjects(true);
      const res = await getStudentEnrolledSubjectsAction();
      if (res.success && res.data && res.data.length > 0) {
        setSubjects(res.data);
        const first = res.data[0];
        if (first) {
          setSelectedSubjectId(first.id);
        }
      }
      setLoadingSubjects(false);
    }
    loadSubjects();
  }, []);

  // Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'student',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setErrorMessage(null);
    setIsSending(true);

    const res = await askStudentTutorAction({
      prompt: userMsg.text,
      subjectId: selectedSubjectId || undefined,
      retrievedStudyMaterial: studyNotes.trim() ? studyNotes.trim() : undefined,
      sourceDocumentName: studyNotes.trim() ? 'Student Uploaded Notes' : undefined,
    });

    setIsSending(false);

    if (res.success && res.data) {
      const tutorMsg: Message = {
        id: `tut-${Date.now()}`,
        sender: 'tutor',
        text: res.data.content || 'I have analyzed your question.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, tutorMsg]);
    } else {
      setErrorMessage(res.error || 'Failed to receive tutor response. Please try again.');
    }
  };

  // Generate Practice Quiz
  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim() || !selectedSubjectId || isGeneratingQuiz) return;
    setIsGeneratingQuiz(true);
    setErrorMessage(null);
    setActiveQuiz(null);
    setSelectedAnswers({});
    setRevealedExplanations({});

    const res = await generateStudentPracticeQuizAction({
      subjectId: selectedSubjectId,
      topic: quizTopic.trim(),
      questionCount: quizCount,
      difficulty: quizDifficulty,
    });

    setIsGeneratingQuiz(false);
    if (res.success && res.data) {
      setActiveQuiz(res.data);
    } else {
      setErrorMessage(res.error || 'Unable to generate quiz. Please check topic or quota.');
    }
  };

  // Generate Revision Plan
  const handleGeneratePlan = async () => {
    if (isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    setErrorMessage(null);
    setRevisionPlanText(null);

    const res = await generateStudentRevisionPlanAction({
      examName: examName.trim() || undefined,
      daysAvailable,
    });

    setIsGeneratingPlan(false);
    if (res.success && res.data) {
      setRevisionPlanText(res.data.content);
    } else {
      setErrorMessage(res.error || 'Unable to build revision timetable.');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">AI Academic Tutor</h2>
            <p className="text-xs text-slate-400">Grounded Socratic explanations & practice</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={`px-3 py-1.5 rounded-lg transition ${
              mode === 'chat' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Tutor Q&A
          </button>
          <button
            type="button"
            onClick={() => setMode('quiz')}
            className={`px-3 py-1.5 rounded-lg transition ${
              mode === 'quiz' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Practice Quiz
          </button>
          <button
            type="button"
            onClick={() => setMode('revision')}
            className={`px-3 py-1.5 rounded-lg transition ${
              mode === 'revision' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Revision Planner
          </button>
        </div>
      </div>

      {/* Subject Filter Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-700">Enrolled Subject:</span>
          {loadingSubjects ? (
            <span className="text-slate-400">Loading curriculum subjects...</span>
          ) : subjects.length > 0 ? (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-amber-700 font-medium">General Curriculum Subject</span>
          )}
        </div>

        {mode === 'chat' && (
          <button
            type="button"
            onClick={() => setShowNotesBox((v) => !v)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            {showNotesBox ? 'Hide Reference Notes' : 'Attach Reference Notes / Chapter'}
          </button>
        )}
      </div>

      {/* Error / Quota Alert Banner */}
      {errorMessage && (
        <div className="p-3 mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reference Notes Dropdown */}
      {mode === 'chat' && showNotesBox && (
        <div className="p-4 mx-4 mt-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-950 font-bold">
            <span>Verified Source Material (Document Grounding)</span>
            <span className="text-[11px] text-indigo-700 font-normal">
              AI tutor will cite this text directly
            </span>
          </div>
          <textarea
            value={studyNotes}
            onChange={(e) => setStudyNotes(e.target.value)}
            placeholder="Paste textbook excerpts, lecture notes, or key definitions here..."
            className="w-full h-24 p-2 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
          />
        </div>
      )}

      {/* MODE 1: CHAT INTERFACE */}
      {mode === 'chat' && (
        <div className="flex flex-col h-[480px]">
          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'student' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.sender === 'student'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.sender === 'student' ? 'You' : 'AI Tutor'} • {msg.timestamp}
                </span>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                Thinking through the concept step-by-step...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question (e.g. 'Explain photosynthesis light-dependent reactions')..."
              disabled={isSending}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Ask</span>
            </button>
          </form>
        </div>
      )}

      {/* MODE 2: PRACTICE QUIZ INTERFACE */}
      {mode === 'quiz' && (
        <div className="p-4 space-y-4">
          {/* Quiz Setup Controls */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Generate Self-Assessment Practice Quiz
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Topic / Chapter
                </label>
                <input
                  type="text"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  placeholder="e.g. Thermodynamics, Linear Equations"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={quizDifficulty}
                  onChange={(e) => setQuizDifficulty(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="easy">Easy (Concept Recall)</option>
                  <option value="medium">Medium (Analytical Application)</option>
                  <option value="hard">Hard (Bloom&apos;s Synthesis)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Questions
                </label>
                <select
                  value={quizCount}
                  onChange={(e) => setQuizCount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={isGeneratingQuiz || !quizTopic.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {isGeneratingQuiz ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Bloom&apos;s Taxonomy Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Practice Quiz
                </>
              )}
            </button>
          </div>

          {/* Active Quiz Card */}
          {activeQuiz && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">{activeQuiz.title}</h4>
                  <p className="text-[11px] text-indigo-700">
                    Topic: {activeQuiz.topic} • {activeQuiz.totalQuestions} Questions
                  </p>
                </div>
                <div className="text-xs font-bold text-indigo-900 bg-white px-3 py-1 rounded-lg border border-indigo-200">
                  Score: {
                    Object.entries(selectedAnswers).filter(
                      ([qIdx, ansIdx]) => activeQuiz.questions[Number(qIdx)]?.correctOptionIndex === ansIdx
                    ).length
                  } / {activeQuiz.totalQuestions}
                </div>
              </div>

              {activeQuiz.questions.map((q, qIndex) => {
                const userSelected = selectedAnswers[qIndex];
                const isAnswered = userSelected !== undefined;
                const isCorrect = userSelected === q.correctOptionIndex;
                const showExp = revealedExplanations[qIndex];

                return (
                  <div
                    key={q.questionNumber || qIndex}
                    className="p-4 border border-slate-200 rounded-xl bg-white space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        Q{q.questionNumber}: {q.questionText}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Option Choices */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIndex) => {
                        let optStyle = 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-800';

                        if (isAnswered) {
                          if (optIndex === q.correctOptionIndex) {
                            optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                          } else if (optIndex === userSelected) {
                            optStyle = 'border-red-500 bg-red-50 text-red-900 line-through';
                          }
                        }

                        return (
                          <button
                            key={optIndex}
                            type="button"
                            onClick={() => {
                              if (!isAnswered) {
                                setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
                              }
                            }}
                            disabled={isAnswered}
                            className={`p-2.5 rounded-xl border text-xs text-left transition flex items-center justify-between ${optStyle}`}
                          >
                            <span>{String.fromCharCode(65 + optIndex)}. {opt}</span>
                            {isAnswered && optIndex === q.correctOptionIndex && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                            )}
                            {isAnswered && optIndex === userSelected && !isCorrect && (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0 ml-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Answer Feedback & Step-by-Step Reasoning */}
                    {isAnswered && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <button
                          type="button"
                          onClick={() => setRevealedExplanations((prev) => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {showExp ? 'Hide Detailed Explanation' : 'View Step-by-Step Reasoning'}
                        </button>
                        {showExp && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">Explanation: </strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: REVISION PLANNER */}
      {mode === 'revision' && (
        <div className="p-4 space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Build Evidence-Based Spaced Repetition Plan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Examination / Term Assessment
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. Midterm Physics, Board Final Exam"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Days Available for Revision
                </label>
                <select
                  value={daysAvailable}
                  onChange={(e) => setDaysAvailable(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value={3}>3 Days (Crash Revision)</option>
                  <option value={7}>7 Days (1 Week Comprehensive)</option>
                  <option value={14}>14 Days (2 Weeks Spaced Retention)</option>
                  <option value={30}>30 Days (Full Term Mastery)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {isGeneratingPlan ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Personalized Revision Timetable...
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  Create Revision Schedule
                </>
              )}
            </button>
          </div>

          {/* Generated Plan Output */}
          {revisionPlanText && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">
                  Personalized Study Plan ({daysAvailable} Days)
                </span>
                <button
                  type="button"
                  onClick={() => handleGeneratePlan()}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {revisionPlanText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
