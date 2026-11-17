import { describe, it, expect } from 'vitest';
import {
  validateAITaskAuthorization,
  getRequiredPermissionForTask,
  type AIAuthContext,
} from '../../apps/web/src/lib/ai/gateway/authorization';

describe('AI Gateway Role & Task Authorization', () => {
  it('maps task types to their corresponding required permissions correctly', () => {
    expect(getRequiredPermissionForTask('tutor_qa')).toBe('ai:tutor');
    expect(getRequiredPermissionForTask('concept_explanation')).toBe('ai:tutor');
    expect(getRequiredPermissionForTask('quiz_generation')).toBe('ai:tutor');
    expect(getRequiredPermissionForTask('revision_plan')).toBe('ai:tutor');

    expect(getRequiredPermissionForTask('lesson_plan')).toBe('ai:teaching_assistant');
    expect(getRequiredPermissionForTask('mcq_generation')).toBe('ai:teaching_assistant');
    expect(getRequiredPermissionForTask('exam_paper_draft')).toBe('ai:teaching_assistant');
    expect(getRequiredPermissionForTask('assignment_draft')).toBe('ai:teaching_assistant');
    expect(getRequiredPermissionForTask('rubric_generation')).toBe('ai:teaching_assistant');

    expect(getRequiredPermissionForTask('owner_analytics')).toBe('ai:analytics');
    expect(getRequiredPermissionForTask('report_generation')).toBe('ai:analytics');

    expect(getRequiredPermissionForTask('parent_summary')).toBe('ai:companion');
  });

  describe('Student Role Permissions', () => {
    const studentContext: AIAuthContext = {
      userId: 'usr-student-1',
      institutionId: 'inst-1',
      role: 'student',
    };

    it('allows student to access AI tutor and study tasks', () => {
      const resTutor = validateAITaskAuthorization(studentContext, 'tutor_qa');
      expect(resTutor.authorized).toBe(true);

      const resQuiz = validateAITaskAuthorization(studentContext, 'quiz_generation');
      expect(resQuiz.authorized).toBe(true);

      const resConcept = validateAITaskAuthorization(studentContext, 'concept_explanation');
      expect(resConcept.authorized).toBe(true);
    });

    it('blocks student from creating exam paper drafts or lesson plans', () => {
      const resExam = validateAITaskAuthorization(studentContext, 'exam_paper_draft');
      expect(resExam.authorized).toBe(false);
      expect(resExam.requiredPermission).toBe('ai:teaching_assistant');
      expect(resExam.reason).toContain("does not have permission 'ai:teaching_assistant'");

      const resPlan = validateAITaskAuthorization(studentContext, 'lesson_plan');
      expect(resPlan.authorized).toBe(false);
    });

    it('blocks student from accessing institutional analytics', () => {
      const resAnalytics = validateAITaskAuthorization(studentContext, 'owner_analytics');
      expect(resAnalytics.authorized).toBe(false);
      expect(resAnalytics.requiredPermission).toBe('ai:analytics');
    });
  });

  describe('Faculty & Academic Admin Role Permissions', () => {
    const facultyContext: AIAuthContext = {
      userId: 'usr-faculty-1',
      institutionId: 'inst-1',
      role: 'faculty',
    };

    it('allows faculty to generate lesson plans, rubrics, and exam drafts', () => {
      expect(validateAITaskAuthorization(facultyContext, 'lesson_plan').authorized).toBe(true);
      expect(validateAITaskAuthorization(facultyContext, 'rubric_generation').authorized).toBe(true);
      expect(validateAITaskAuthorization(facultyContext, 'exam_paper_draft').authorized).toBe(true);
      expect(validateAITaskAuthorization(facultyContext, 'mcq_generation').authorized).toBe(true);
    });

    it('blocks faculty without analytics permission from institutional owner analytics', () => {
      const resAnalytics = validateAITaskAuthorization(facultyContext, 'owner_analytics');
      expect(resAnalytics.authorized).toBe(false);
      expect(resAnalytics.requiredPermission).toBe('ai:analytics');
    });
  });

  describe('Parent Role Permissions', () => {
    const parentContext: AIAuthContext = {
      userId: 'usr-parent-1',
      institutionId: 'inst-1',
      role: 'parent',
    };

    it('allows parent to access parent summary guidance', () => {
      const resSummary = validateAITaskAuthorization(parentContext, 'parent_summary');
      expect(resSummary.authorized).toBe(true);
      expect(resSummary.requiredPermission).toBe('ai:companion');
    });

    it('blocks parent from generating exam papers or institutional reports', () => {
      expect(validateAITaskAuthorization(parentContext, 'exam_paper_draft').authorized).toBe(false);
      expect(validateAITaskAuthorization(parentContext, 'owner_analytics').authorized).toBe(false);
    });
  });

  describe('Owner & Admin Role Permissions', () => {
    const ownerContext: AIAuthContext = {
      userId: 'usr-owner-1',
      institutionId: 'inst-1',
      role: 'owner',
    };

    it('allows owner full access across all AI task categories', () => {
      expect(validateAITaskAuthorization(ownerContext, 'owner_analytics').authorized).toBe(true);
      expect(validateAITaskAuthorization(ownerContext, 'report_generation').authorized).toBe(true);
      expect(validateAITaskAuthorization(ownerContext, 'lesson_plan').authorized).toBe(true);
      expect(validateAITaskAuthorization(ownerContext, 'exam_paper_draft').authorized).toBe(true);
      expect(validateAITaskAuthorization(ownerContext, 'tutor_qa').authorized).toBe(true);
      expect(validateAITaskAuthorization(ownerContext, 'parent_summary').authorized).toBe(true);
    });
  });
});
