import type { AITaskType, Permission, Role } from '@edu-platform/types';
import { ROLE_PERMISSIONS } from '@edu-platform/types';

export interface AIAuthContext {
  userId: string;
  institutionId: string;
  role: Role;
  permissions?: Permission[];
}

export interface AuthValidationResult {
  authorized: boolean;
  requiredPermission: Permission;
  reason?: string;
}

/**
 * Maps an AI task type to its required permission
 */
export function getRequiredPermissionForTask(taskType: AITaskType): Permission {
  switch (taskType) {
    case 'tutor_qa':
    case 'concept_explanation':
    case 'quiz_generation':
    case 'revision_plan':
      return 'ai:tutor';

    case 'lesson_plan':
    case 'mcq_generation':
    case 'exam_paper_draft':
    case 'assignment_draft':
    case 'rubric_generation':
      return 'ai:teaching_assistant';

    case 'owner_analytics':
    case 'report_generation':
      return 'ai:analytics';

    case 'parent_summary':
      return 'ai:companion';

    default:
      return 'institution:view';
  }
}

/**
 * Validates whether the caller holds the authorized permission for the requested AI task
 */
export function validateAITaskAuthorization(
  authContext: AIAuthContext,
  taskType: AITaskType
): AuthValidationResult {
  const requiredPermission = getRequiredPermissionForTask(taskType);
  const role = authContext.role;

  // 1. Check role default permissions
  const defaultRolePermissions = ROLE_PERMISSIONS[role] || [];
  const hasRolePermission = defaultRolePermissions.includes(requiredPermission);

  // 2. Check explicit custom permissions on membership if present
  const hasCustomPermission = (authContext.permissions || []).includes(requiredPermission);

  if (!hasRolePermission && !hasCustomPermission) {
    return {
      authorized: false,
      requiredPermission,
      reason: `Role '${role}' does not have permission '${requiredPermission}' to execute task '${taskType}'.`,
    };
  }

  return {
    authorized: true,
    requiredPermission,
  };
}
