'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  generateLessonPlanAction,
  draftExamPaperAction,
  generateAssignmentPromptAction,
  generateRubricAction,
  generateMCQQuestionBankAction,
} from '@/app/actions/aiActions';
import {
  Sparkles,
  BookOpen,
  FileQuestion,
  FileText,
  ListOrdered,
  Layers,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export function TeacherAssistantWorkspace() {
  const [activeTab, setActiveTab] = useState<'lesson_plan' | 'exam_paper' | 'assignment' | 'rubric' | 'mcq'>('lesson_plan');

  // Lesson Plan Inputs
  const [lpTopic, setLpTopic] = useState('');
  const [lpGrade, setLpGrade] = useState('Grade 10');
  const [lpDuration, setLpDuration] = useState(45);
  const [lpObjectives, setLpObjectives] = useState('');

  // Exam Paper Inputs
  const [examTitle, setExamTitle] = useState('');
  const [examGrade, setExamGrade] = useState('Grade 10');
  const [examDuration, setExamDuration] = useState(90);
  const [examMarks, setExamMarks] = useState(100);
  const [examTopics, setExamTopics] = useState('');

  // Assignment Inputs
  const [assignTitle, setAssignTitle] = useState('');
  const [assignTopic, setAssignTopic] = useState('');
  const [assignGrade, setAssignGrade] = useState('Grade 10');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignDays, setAssignDays] = useState(7);

  // Rubric Inputs
  const [rubricTitle, setRubricTitle] = useState('');
  const [rubricDesc, setRubricDesc] = useState('');
  const [rubricMarks, setRubricMarks] = useState(20);

  // MCQ Inputs
  const [mcqTopic, setMcqTopic] = useState('');
  const [mcqCount, setMcqCount] = useState(10);
  const [mcqDifficulty, setMcqDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedDraftInfo, setGeneratedDraftInfo] = useState<{
    draftId: string;
    title: string;
    data: any;
  } | null>(null);

  // Action Handlers
  const handleGenerateLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpTopic.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedDraftInfo(null);

    const objs = lpObjectives.trim()
      ? lpObjectives.split('\n').map((o) => o.trim()).filter(Boolean)
      : undefined;

    const res = await generateLessonPlanAction({
      topic: lpTopic.trim(),
      gradeLevel: lpGrade,
      durationMinutes: lpDuration,
      learningObjectives: objs,
    });

    setIsGenerating(false);
    if (res.success && res.data) {
      setGeneratedDraftInfo({
        draftId: res.data.draftId,
        title: `Lesson Plan: ${lpTopic} (${lpGrade})`,
        data: res.data.lessonPlan,
      });
    } else {
      setErrorMessage(res.error || 'Failed to generate lesson plan.');
    }
  };

  const handleDraftExamPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedDraftInfo(null);

    const topics = examTopics.trim()
      ? examTopics.split('\n').map((t) => t.trim()).filter(Boolean)
      : undefined;

    const res = await draftExamPaperAction({
      title: examTitle.trim(),
      gradeLevel: examGrade,
      durationMinutes: examDuration,
      totalMarks: examMarks,
      topicsCoverage: topics,
    });

    setIsGenerating(false);
    if (res.success && res.data) {
      setGeneratedDraftInfo({
        draftId: res.data.draftId,
        title: `Exam Paper: ${examTitle} (${examGrade})`,
        data: res.data.examPaper,
      });
    } else {
      setErrorMessage(res.error || 'Failed to draft exam paper.');
    }
  };

  const handleGenerateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignTopic.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedDraftInfo(null);

    const res = await generateAssignmentPromptAction({
      title: assignTitle.trim(),
      topic: assignTopic.trim(),
      gradeLevel: assignGrade,
      instructions: assignInstructions.trim() || undefined,
      dueDateDays: assignDays,
    });

    setIsGenerating(false);
    if (res.success && res.data) {
      setGeneratedDraftInfo({
        draftId: res.data.draftId,
        title: `Assignment: ${assignTitle}`,
        data: res.data.assignment,
      });
    } else {
      setErrorMessage(res.error || 'Failed to generate assignment.');
    }
  };

  const handleGenerateRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubricTitle.trim() || !rubricDesc.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedDraftInfo(null);

    const res = await generateRubricAction({
      title: rubricTitle.trim(),
      assignmentDescription: rubricDesc.trim(),
      totalMarks: rubricMarks,
    });

    setIsGenerating(false);
    if (res.success && res.data) {
      setGeneratedDraftInfo({
        draftId: res.data.draftId,
        title: `Rubric: ${rubricTitle}`,
        data: res.data.rubric,
      });
    } else {
      setErrorMessage(res.error || 'Failed to generate rubric.');
    }
  };

  const handleGenerateMCQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcqTopic.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedDraftInfo(null);

    const res = await generateMCQQuestionBankAction({
      topic: mcqTopic.trim(),
      count: mcqCount,
      difficulty: mcqDifficulty,
    });

    setIsGenerating(false);
    if (res.success && res.data) {
      setGeneratedDraftInfo({
        draftId: res.data.draftId,
        title: `Question Bank: ${mcqTopic} (${mcqCount} Questions)`,
        data: res.data.questionBank,
      });
    } else {
      setErrorMessage(res.error || 'Failed to generate question bank.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
            Faculty AI Intelligence
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Teacher AI Assistant</h1>
          <p className="text-xs text-slate-300 mt-1">
            Author pedagogical lesson plans, assessments, rubrics, and question banks.
          </p>
        </div>

        <Link
          href="/dashboard/ai-drafts"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/20 self-start sm:self-auto"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>View Drafts Hub</span>
        </Link>
      </div>

      {/* Safety Guard Notice */}
      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Human Review Required: </strong>
          All AI-generated materials are saved to <code>ai_generated_drafts</code> with status <code>draft</code>.
          Exams, marks, and lesson plans must be reviewed and approved by faculty before official adoption.
        </div>
      </div>

      {/* Workspace Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('lesson_plan'); setGeneratedDraftInfo(null); }}
            className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'lesson_plan'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lesson Plan</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('exam_paper'); setGeneratedDraftInfo(null); }}
            className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'exam_paper'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>Exam Paper Drafter</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('assignment'); setGeneratedDraftInfo(null); }}
            className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assignment'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Assignment Prompt</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('rubric'); setGeneratedDraftInfo(null); }}
            className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rubric'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Assessment Rubric</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('mcq'); setGeneratedDraftInfo(null); }}
            className={`px-4 py-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'mcq'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Question Bank</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="font-bold text-red-600">✕</button>
          </div>
        )}

        <div className="p-6">
          {/* TAB 1: LESSON PLAN */}
          {activeTab === 'lesson_plan' && (
            <form onSubmit={handleGenerateLessonPlan} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lesson Topic *
                  </label>
                  <input
                    type="text"
                    required
                    value={lpTopic}
                    onChange={(e) => setLpTopic(e.target.value)}
                    placeholder="e.g. Mendelian Genetics & Punnett Squares"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grade Level
                  </label>
                  <input
                    type="text"
                    value={lpGrade}
                    onChange={(e) => setLpGrade(e.target.value)}
                    placeholder="e.g. Grade 10"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={lpDuration}
                  onChange={(e) => setLpDuration(Number(e.target.value))}
                  className="w-32 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Learning Objectives (One per line, optional)
                </label>
                <textarea
                  value={lpObjectives}
                  onChange={(e) => setLpObjectives(e.target.value)}
                  placeholder="e.g. Students can define homozygous vs heterozygous&#10;Students can solve a monohybrid cross"
                  className="w-full h-20 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating || !lpTopic.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate 5E Lesson Plan
              </button>
            </form>
          )}

          {/* TAB 2: EXAM PAPER */}
          {activeTab === 'exam_paper' && (
            <form onSubmit={handleDraftExamPaper} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Examination Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="e.g. Midterm Physics Examination"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Grade Level
                  </label>
                  <input
                    type="text"
                    value={examGrade}
                    onChange={(e) => setExamGrade(e.target.value)}
                    placeholder="e.g. Grade 11"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={examMarks}
                    onChange={(e) => setExamMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topics to Cover (One per line)
                </label>
                <textarea
                  value={examTopics}
                  onChange={(e) => setExamTopics(e.target.value)}
                  placeholder="e.g. Kinematics&#10;Newtonian Mechanics&#10;Conservation of Momentum"
                  className="w-full h-20 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating || !examTitle.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Draft Balanced Exam Paper
              </button>
            </form>
          )}

          {/* TAB 3: ASSIGNMENT */}
          {activeTab === 'assignment' && (
            <form onSubmit={handleGenerateAssignment} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Title *</label>
                  <input
                    type="text"
                    required
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    placeholder="e.g. Renewable Energy Case Study"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Core Topic *</label>
                  <input
                    type="text"
                    required
                    value={assignTopic}
                    onChange={(e) => setAssignTopic(e.target.value)}
                    placeholder="e.g. Solar Energy in Commercial Buildings"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grade Level</label>
                  <input
                    type="text"
                    value={assignGrade}
                    onChange={(e) => setAssignGrade(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due in (Days)</label>
                  <input
                    type="number"
                    value={assignDays}
                    onChange={(e) => setAssignDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions / Specific Requirements</label>
                <textarea
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  placeholder="e.g. 1500 words, must cite at least 3 peer-reviewed sources"
                  className="w-full h-20 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating || !assignTitle.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Assignment Prompt
              </button>
            </form>
          )}

          {/* TAB 4: RUBRIC */}
          {activeTab === 'rubric' && (
            <form onSubmit={handleGenerateRubric} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rubric Title *</label>
                <input
                  type="text"
                  required
                  value={rubricTitle}
                  onChange={(e) => setRubricTitle(e.target.value)}
                  placeholder="e.g. Science Fair Presentation Scoring Rubric"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={rubricMarks}
                  onChange={(e) => setRubricMarks(Number(e.target.value))}
                  className="w-32 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignment Context & Assessment Criteria *</label>
                <textarea
                  required
                  value={rubricDesc}
                  onChange={(e) => setRubricDesc(e.target.value)}
                  placeholder="Describe what students are being assessed on (e.g. Methodology, Evidence, Presentation, Critical Thinking)"
                  className="w-full h-24 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating || !rubricTitle.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate 4-Tier Analytic Rubric
              </button>
            </form>
          )}

          {/* TAB 5: MCQ QUESTION BANK */}
          {activeTab === 'mcq' && (
            <form onSubmit={handleGenerateMCQ} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topic / Subject Area *</label>
                <input
                  type="text"
                  required
                  value={mcqTopic}
                  onChange={(e) => setMcqTopic(e.target.value)}
                  placeholder="e.g. Organic Chemistry Functional Groups"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Number of MCQs</label>
                  <select
                    value={mcqCount}
                    onChange={(e) => setMcqCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={mcqDifficulty}
                    onChange={(e) => setMcqDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value="easy">Easy (Recall)</option>
                    <option value="medium">Medium (Application)</option>
                    <option value="hard">Hard (Analysis)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !mcqTopic.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate MCQ Question Bank
              </button>
            </form>
          )}

          {/* SUCCESS BANNER & PREVIEW */}
          {generatedDraftInfo && (
            <div className="mt-8 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Draft Created Successfully (ID: {generatedDraftInfo.draftId})</span>
                </div>
                <Link
                  href="/dashboard/ai-drafts"
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                >
                  <span>Review in Drafts Hub</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="text-xs font-semibold text-slate-900">
                {generatedDraftInfo.title}
              </div>

              <div className="max-h-60 overflow-y-auto p-3 bg-white border border-emerald-100 rounded-xl text-[11px] font-mono text-slate-700 whitespace-pre-wrap">
                {JSON.stringify(generatedDraftInfo.data, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
