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
  // Get all employees for onboarding - Fixed to get user's company properly
  getEmployees: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // First get the user's profile to find their company
        const userProfile = await db.query.profile.findFirst({
        where: eq(profiles.userId, ctx.session.user.id), // Assuming session has userId
        columns: { companyId: true }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Now get employees with relations
      return await db.query.employeeProfile.findMany({
        where: and(
          eq(employeeProfiles.companyId, userProfile.companyId),
          input.status ? eq(employeeProfiles.status, input.status) : undefined
        ),
        with: {
          user: {
            with: {
              user: {
                columns: {
                  name: true,
                  email: true,
                }
              }
            },
            columns: {
              firstName: true,
              lastName: true,
            }
          },
          manager: {
            columns: {
              firstName: true,
              lastName: true,
            }
          },
          taskAssignments: {
            with: {
              task: {
                columns: {
                  title: true,
                  taskType: true,
                }
              }
            }
          }
        },
        orderBy: [desc(employeeProfiles.createdAt)],
      });
    }),

  // Create new employee profile - Fixed to properly handle user creation
  createEmployee: protectedProcedure
    .input(z.object({
      userId: z.string(), // This should be the profile ID, not auth user ID
      employeeId: z.string().optional(),
      startDate: z.string(),
      department: z.string(),
      position: z.string(),
      managerId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's company
      const userProfile = await db.query.profile.findFirst({
        where: eq(profiles.userId, ctx.session.user.id),
        columns: { companyId: true }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const [employee] = await db.insert(employeeProfiles).values({
        ...input,
        companyId: userProfile.companyId,
      }).returning();
      
      return employee;
    }),

  // Get employee progress - Enhanced with relations
  getEmployeeProgress: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const employee = await db.query.employeeProfile.findFirst({
        where: eq(employeeProfiles.id, input.employeeId),
        with: {
          taskAssignments: {
            with: {
              task: {
                columns: {
                  title: true,
                  description: true,
                  taskType: true,
                  required: true,
                  orderSequence: true,
                }
              }
            },
            orderBy: [employeeTaskAssignments.assignedDate],
          },
          user: {
            columns: {
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      const totalTasks = employee.taskAssignments.length;
      const completedTasks = employee.taskAssignments.filter(a => a.status === 'completed').length;
      const requiredTasks = employee.taskAssignments.filter(a => a.task.required).length;
      const completedRequiredTasks = employee.taskAssignments.filter(
        a => a.task.required && a.status === 'completed'
      ).length;

      return {
        employee,
        totalTasks,
        completedTasks,
        requiredTasks,
        completedRequiredTasks,
        progressPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        requiredProgressPercentage: requiredTasks > 0 ? (completedRequiredTasks / requiredTasks) * 100 : 0,
        assignments: employee.taskAssignments,
      };
    }),

  // Complete task - Following todo.ts pattern
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

  // Get all tasks for onboarding - Fixed company retrieval
  getAllTasks: protectedProcedure
    .query(async ({ ctx }) => {
      // Get user's company from their profile
      const userProfile = await db.query.profile.findFirst({
        where: eq(profiles.userId, ctx.session.user.id),
        columns: { companyId: true }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      return await db.query.onboardingTasks.findMany({
        where: and(
          eq(onboardingTasks.companyId, userProfile.companyId),
          eq(onboardingTasks.isActive, true)
        ),
        orderBy: [onboardingTasks.orderSequence, onboardingTasks.title],
      });
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
      const userProfile = await db.query.profile.findFirst({
        where: eq(profiles.userId, ctx.session.user.id),
        columns: { companyId: true }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      return await db.insert(onboardingTasks).values({
        ...input,
        companyId: userProfile.companyId,
        isActive: true,
      }).returning();
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

  // Assign tasks to employee - New helper method
  assignTasksToEmployee: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      taskIds: z.array(z.string()).optional(), // If not provided, assign all active tasks
    }))
    .mutation(async ({ ctx, input }) => {
      const { employeeId, taskIds } = input;

      // Get user's company
          const userProfile = await db.query.profile.findFirst({
        where: eq(profiles.userId, ctx.session.user.id),
        columns: { companyId: true }
      });

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get tasks to assign
      const tasks = taskIds 
        ? await db.query.onboardingTasks.findMany({
            where: and(
              eq(onboardingTasks.companyId, userProfile.companyId),
              // Add filter for specific task IDs
            )
          })
        : await db.query.onboardingTasks.findMany({
            where: and(
              eq(onboardingTasks.companyId, userProfile.companyId),
              eq(onboardingTasks.isActive, true)
            )
          });

      // Create assignments
      const assignments = tasks.map(task => ({
        employeeProfileId: employeeId,
        onboardingTaskId: task.id,
        status: 'pending' as const,
      }));

      return await db.insert(employeeTaskAssignments).values(assignments).returning();
    }),
});