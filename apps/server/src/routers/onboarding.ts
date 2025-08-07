import { z } from 'zod';
import { router, protectedProcedure } from '../lib/trpc';
import { 
  employeeProfiles, 
  employeeTaskAssignments, 
  onboardingTasks 
} from '@/db/schema/onboarding';
import { profiles } from '@/db/schema/profile';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';

export const onboardingRouter = router({
  // Get all employees for onboarding - Simplified approach
  getEmployees: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get the user's profile to find their company
      const userProfile = await db
        .select({ companyId: profiles.companyId })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new Error('User profile not found');
      }

      // Build where conditions
      const whereConditions = [
        eq(employeeProfiles.companyId, userProfile[0].companyId)
      ];
      
      if (input.status) {
        whereConditions.push(eq(employeeProfiles.status, input.status));
      }

      // Get employees
      return await db
        .select()
        .from(employeeProfiles)
        .where(and(...whereConditions))
        .orderBy(desc(employeeProfiles.createdAt));
    }),

  // Create new employee profile - Simplified
  createEmployee: protectedProcedure
    .input(z.object({
      userId: z.string(),
      employeeId: z.string().optional(),
      startDate: z.string(),
      department: z.string(),
      position: z.string(),
      managerId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's company
      const userProfile = await db
        .select({ companyId: profiles.companyId })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new Error('User profile not found');
      }

      return await db
        .insert(employeeProfiles)
        .values({
          ...input,
          companyId: userProfile[0].companyId,
        })
        .returning();
    }),

  // Get employee progress - Simplified with separate queries
  getEmployeeProgress: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get employee
      const employee = await db
        .select()
        .from(employeeProfiles)
        .where(eq(employeeProfiles.id, input.employeeId))
        .limit(1);

      if (!employee[0]) {
        throw new Error('Employee not found');
      }

      // Get task assignments
      const assignments = await db
        .select({
          id: employeeTaskAssignments.id,
          status: employeeTaskAssignments.status,
          assignedDate: employeeTaskAssignments.assignedDate,
          completedDate: employeeTaskAssignments.completedDate,
          notes: employeeTaskAssignments.notes,
          taskId: onboardingTasks.id,
          taskTitle: onboardingTasks.title,
          taskDescription: onboardingTasks.description,
          taskType: onboardingTasks.taskType,
          required: onboardingTasks.required,
          orderSequence: onboardingTasks.orderSequence,
        })
        .from(employeeTaskAssignments)
        .leftJoin(onboardingTasks, eq(employeeTaskAssignments.onboardingTaskId, onboardingTasks.id))
        .where(eq(employeeTaskAssignments.employeeProfileId, input.employeeId))
        .orderBy(employeeTaskAssignments.assignedDate);

      const totalTasks = assignments.length;
      const completedTasks = assignments.filter(a => a.status === 'completed').length;
      const requiredTasks = assignments.filter(a => a.required).length;
      const completedRequiredTasks = assignments.filter(
        a => a.required && a.status === 'completed'
      ).length;

      return {
        employee: employee[0],
        totalTasks,
        completedTasks,
        requiredTasks,
        completedRequiredTasks,
        progressPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        requiredProgressPercentage: requiredTasks > 0 ? (completedRequiredTasks / requiredTasks) * 100 : 0,
        assignments,
      };
    }),

  // Complete task - Following todo.ts pattern exactly
  completeTask: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db
        .update(employeeTaskAssignments)
        .set({
          status: 'completed',
          completedDate: new Date(),
          notes: input.notes,
        })
        .where(eq(employeeTaskAssignments.id, input.assignmentId));
    }),

  // Get all tasks - Simplified
  getAllTasks: protectedProcedure
    .query(async ({ ctx }) => {
      // Get user's company
      const userProfile = await db
        .select({ companyId: profiles.companyId })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new Error('User profile not found');
      }

      return await db
        .select()
        .from(onboardingTasks)
        .where(and(
          eq(onboardingTasks.companyId, userProfile[0].companyId),
          eq(onboardingTasks.isActive, true)
        ))
        .orderBy(onboardingTasks.orderSequence, onboardingTasks.title);
    }),

  // Create new task - Following todo.ts pattern
  createTask: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      taskType: z.enum(['form', 'document', 'acknowledgment', 'training']),
      required: z.boolean().default(true),
      orderSequence: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's company
      const userProfile = await db
        .select({ companyId: profiles.companyId })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new Error('User profile not found');
      }

      return await db
        .insert(onboardingTasks)
        .values({
          ...input,
          companyId: userProfile[0].companyId,
          isActive: true,
        })
        .returning();
    }),

  // Update task - Following todo.ts pattern
  updateTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      taskType: z.enum(['form', 'document', 'acknowledgment', 'training']),
      required: z.boolean(),
      orderSequence: z.number().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { taskId, ...updateData } = input;
      
      return await db
        .update(onboardingTasks)
        .set(updateData)
        .where(eq(onboardingTasks.id, taskId));
    }),

  // Delete task - Following todo.ts pattern
  deleteTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db
        .delete(onboardingTasks)
        .where(eq(onboardingTasks.id, input.taskId));
    }),

  // Assign tasks to employee - Simplified
  assignTasksToEmployee: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      taskIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { employeeId, taskIds } = input;

      // Get user's company
      const userProfile = await db
        .select({ companyId: profiles.companyId })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new Error('User profile not found');
      }

      // Get tasks to assign
      let tasks;
      if (taskIds) {
        tasks = await db
          .select()
          .from(onboardingTasks)
          .where(and(
            eq(onboardingTasks.companyId, userProfile[0].companyId),
            // Note: You'd need to implement an 'in' operator for multiple IDs
          ));
      } else {
        tasks = await db
          .select()
          .from(onboardingTasks)
          .where(and(
            eq(onboardingTasks.companyId, userProfile[0].companyId),
            eq(onboardingTasks.isActive, true)
          ));
      }

      // Create assignments
      const assignments = tasks.map(task => ({
        employeeProfileId: employeeId,
        onboardingTaskId: task.id,
        status: 'pending' as const,
      }));

      return await db
        .insert(employeeTaskAssignments)
        .values(assignments)
        .returning();
    }),
});