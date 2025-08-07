import { z } from 'zod';
import { router, protectedProcedure } from '../lib/trpc';
import { employeeProfiles, employeeTaskAssignments, onboardingTasks } from '@/db/schema/onboarding';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';

export const onboardingRouter = router({
  // Get all employees for onboarding
  getEmployees: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await db.select().from(employeeProfiles).where(
        and(
          eq(employeeProfiles.companyId, ctx.session.user.id),
          input.status ? eq(employeeProfiles.status, input.status) : undefined
        )
      );
    }),


  // Create new employee profile
  createEmployee: protectedProcedure
    .input(z.object({
      userId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      companyId: z.string(),
      employeeId: z.string().optional(),
      startDate: z.string(),
      department: z.string(),
      position: z.string(),
      managerId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [employee] = await db.insert(employeeProfiles).values(input).returning();
      
      return employee;
    }),

  // Get employee progress
  getEmployeeProgress: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
        const assignments = await db.select().from(employeeTaskAssignments).where(
            eq(employeeTaskAssignments.employeeProfileId, input.employeeId)
        );

        const totalTasks = assignments.length;
        const completedTasks = assignments.filter(a => a.status === 'completed').length;

        return {
            totalTasks,
            completedTasks,
            progressPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            assignments,
        };
    }),

    // Complete task
    completeTask: protectedProcedure
      .input(z.object({
        assignmentId: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.update(employeeTaskAssignments)
        .set({
          status: 'completed',
          completedDate: new Date(),
          notes: input.notes,
        })
        .where(eq(employeeTaskAssignments.id, input.assignmentId));

        return { success: true };
      }),

  // Get all tasks for onboarding
  getAllTasks: protectedProcedure
    .input(z.object({
      companyId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
        return await db.select().from(onboardingTasks).where(
            eq(onboardingTasks.companyId, input.companyId)
        );
    }),

    // Create new task
    createTask: protectedProcedure
      .input(z.object({
        companyId: z.string().uuid(),
        title: z.string(),
        description: z.string(),
        taskType: z.enum(['form', 'document', 'acknowledgment', 'training']),
        required: z.boolean(),
        orderSequence: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.insert(onboardingTasks).values({
          ...input,
          companyId: ctx.session.user.id,
        });

        return { success: true };
      }),

    // Update task
    updateTask: protectedProcedure
      .input(z.object({
        taskId: z.string(),
        title: z.string(),
        description: z.string(),
        taskType: z.enum(['form', 'document', 'acknowledgment', 'training']),
        required: z.boolean(),
        orderSequence: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.update(onboardingTasks)
        .set({
          ...input,
          companyId: ctx.session.user.id,
        })
        .where(eq(onboardingTasks.id, input.taskId));

        return { success: true };
      }),

    // Delete task
    deleteTask: protectedProcedure
      .input(z.object({
        taskId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.delete(onboardingTasks).where(eq(onboardingTasks.id, input.taskId));
        return { success: true };
      }),
});