import { z } from 'zod';
import { router, protectedProcedure } from '../lib/trpc';
import { 
  employeeProfiles, 
  employeeTaskAssignments, 
  onboardingTasks,
  employeeInvitations,
  roleAssignments
} from '@/db/schema/onboarding';
import { profiles } from '@/db/schema/profile';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';

export const onboardingRouter = router({
  // Get all employees for managers/admins
  getEmployees: protectedProcedure
    .input(z.object({
      onboardingStatus: z.enum(['not_started', 'invited', 'in_progress', 'completed']).optional(),
      department: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get user's profile and company
      const userProfile = await db
        .select({ 
          id: profiles.id,
          companyId: profiles.companyId, 
          primaryRole: profiles.primaryRole 
        })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' });
      }

      // Check if user has permission to view employees
      if (userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // Build where conditions
      const whereConditions = [
        eq(employeeProfiles.companyId, userProfile[0].companyId)
      ];
      
      if (input.onboardingStatus) {
        whereConditions.push(eq(employeeProfiles.onboardingStatus, input.onboardingStatus));
      }
      
      if (input.department) {
        whereConditions.push(eq(employeeProfiles.department, input.department));
      }

      // If user is a manager, only show their direct reports
      if (userProfile[0].primaryRole === 'manager') {
        whereConditions.push(eq(employeeProfiles.managerId, userProfile[0].id));
      }

      return await db
        .select({
          id: employeeProfiles.id,
          firstName: employeeProfiles.firstName,
          lastName: employeeProfiles.lastName,
          personlEmail: employeeProfiles.personalEmail,
          workEmail: employeeProfiles.workEmail,
          employeeId: employeeProfiles.employeeId,
          position: employeeProfiles.position,
          department: employeeProfiles.department,
          startDate: employeeProfiles.startDate,
          onboardingStatus: employeeProfiles.onboardingStatus,
          createdAt: employeeProfiles.createdAt,
          invitationSentAt: employeeProfiles.invitationSentAt,
          firstLoginAt: employeeProfiles.firstLoginAt,
          onboardingCompletedAt: employeeProfiles.onboardingCompletedAt,
        })
        .from(employeeProfiles)
        .where(and(...whereConditions))
        .orderBy(desc(employeeProfiles.createdAt));
    }),

  // Create new employee profile (Manager/Admin only)
  createEmployee: protectedProcedure
    .input(z.object({
      // Personal Information
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      personalEmail: z.string().email('Valid email is required'),
      workEmail: z.string().email('Valid email is required'),
      phoneNumber: z.string().optional(),
      dateOfBirth: z.string().optional(), // YYYY-MM-DD
      address: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      
      // Work Details
      employeeId: z.string().optional(),
      startDate: z.string().min(1, 'Start date is required'),
      department: z.string().min(1, 'Department is required'),
      position: z.string().min(1, 'Position is required'),
      employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).default('full_time'),
      
      // Compensation
      salary: z.number().positive().optional(),
      currency: z.string().default('USD'),
      payFrequency: z.enum(['monthly', 'bi_weekly', 'weekly']).default('monthly'),
      
      // Management
      managerId: z.string().optional(),
      accessLevel: z.enum(['general', 'senior','top-level','IT', 'admin']).default('general'),
      
      // Auto-assign default tasks
      assignDefaultTasks: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's profile and permissions
      const userProfile = await db
        .select({ 
          id: profiles.id,
          companyId: profiles.companyId, 
          primaryRole: profiles.primaryRole 
        })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' });
      }

      // Check permissions
      if (userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions to create employees' });
      }

      // Check if email already exists
      const existingEmployee = await db
        .select({ id: employeeProfiles.id })
        .from(employeeProfiles)
        .where(and(
          eq(employeeProfiles.personalEmail, input.personalEmail),
          eq(employeeProfiles.companyId, userProfile[0].companyId)
        ))
        .limit(1);

      if (existingEmployee[0]) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Employee with this email already exists' });
      }

      // Create employee profile
      const [newEmployee] = await db
        .insert(employeeProfiles)
        .values({
          ...input,
          companyId: userProfile[0].companyId,
          createdBy: userProfile[0].id,
          onboardingStatus: 'not_started',
          isActive: true,
        })
        .returning();

      // Auto-assign default tasks if requested
      if (input.assignDefaultTasks) {
        const defaultTasks = await db
          .select()
          .from(onboardingTasks)
          .where(and(
            eq(onboardingTasks.companyId, userProfile[0].companyId),
            eq(onboardingTasks.isActive, true)
          ));

        if (defaultTasks.length > 0) {
          const assignments = defaultTasks.map(task => ({
            employeeProfileId: newEmployee.id,
            onboardingTaskId: task.id,
            status: 'pending' as const,
            assignedBy: userProfile[0].id,
          }));

          await db
            .insert(employeeTaskAssignments)
            .values(assignments);
        }
      }

      return newEmployee;
    }),

  // Send invitation to employee
  sendInvitation: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's profile
      const userProfile = await db
        .select({ id: profiles.id, primaryRole: profiles.primaryRole })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0] || userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // Get employee
      const employee = await db
        .select()
        .from(employeeProfiles)
        .where(eq(employeeProfiles.id, input.employeeId))
        .limit(1);

      if (!employee[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
      }

      // Generate invitation token
      const invitationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation record
      const [invitation] = await db
        .insert(employeeInvitations)
        .values({
          employeeProfileId: employee[0].id,
          email: employee[0].personalEmail,
          invitationToken,
          expiresAt: expiresAt.getTime(),
        })
        .returning();

      // Update employee status
      await db
        .update(employeeProfiles)
        .set({
          onboardingStatus: 'invited',
          invitationSentAt: new Date().getTime() ?? null,
        })
        .where(eq(employeeProfiles.id, employee[0].id));

      // TODO: Send actual email with invitation link
      // const invitationLink = `${process.env.APP_URL}/invite/${invitationToken}`;
      
      return { 
        success: true, 
        invitationToken, 
        expiresAt,
        // invitationLink 
      };
    }),

  // Get employee's own onboarding progress (for employee dashboard)
  getMyProgress: protectedProcedure
    .query(async ({ ctx }) => {
      // Get user's profile
      const userProfile = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' });
      }

      // Get employee profile
      const employee = await db
        .select()
        .from(employeeProfiles)
        .where(eq(employeeProfiles.userId, userProfile[0].id))
        .limit(1);

      if (!employee[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee profile not found' });
      }

      // Get task assignments
      const assignments = await db
        .select({
          id: employeeTaskAssignments.id,
          status: employeeTaskAssignments.status,
          priority: employeeTaskAssignments.priority,
          dueDate: employeeTaskAssignments.dueDate,
          assignedDate: employeeTaskAssignments.assignedDate,
          startedAt: employeeTaskAssignments.startedAt,
          completedDate: employeeTaskAssignments.completedDate,
          notes: employeeTaskAssignments.notes,
          taskId: onboardingTasks.id,
          taskTitle: onboardingTasks.title,
          taskDescription: onboardingTasks.description,
          taskType: onboardingTasks.taskType,
          required: onboardingTasks.required,
          orderSequence: onboardingTasks.orderSequence,
          estimatedMinutes: onboardingTasks.estimatedMinutes,
        })
        .from(employeeTaskAssignments)
        .leftJoin(onboardingTasks, eq(employeeTaskAssignments.onboardingTaskId, onboardingTasks.id))
        .where(eq(employeeTaskAssignments.employeeProfileId, employee[0].id))
        .orderBy(onboardingTasks.orderSequence, employeeTaskAssignments.assignedDate);

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

  // Get specific employee progress (for managers)
  getEmployeeProgress: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get user's profile
      const userProfile = await db
        .select({ 
          id: profiles.id, 
          primaryRole: profiles.primaryRole,
          companyId: profiles.companyId 
        })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' });
      }

      // Get employee
      const employee = await db
        .select()
        .from(employeeProfiles)
        .where(and(
          eq(employeeProfiles.id, input.employeeId),
          eq(employeeProfiles.companyId, userProfile[0].companyId)
        ))
        .limit(1);

      if (!employee[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
      }

      // Check permissions - managers can only see their direct reports
      if (userProfile[0].primaryRole === 'manager' && 
          employee[0].managerId !== userProfile[0].id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only view your direct reports' });
      }

      // Get task assignments (same logic as getMyProgress)
      const assignments = await db
        .select({
          id: employeeTaskAssignments.id,
          status: employeeTaskAssignments.status,
          priority: employeeTaskAssignments.priority,
          dueDate: employeeTaskAssignments.dueDate,
          assignedDate: employeeTaskAssignments.assignedDate,
          startedAt: employeeTaskAssignments.startedAt,
          completedDate: employeeTaskAssignments.completedDate,
          notes: employeeTaskAssignments.notes,
          completionData: employeeTaskAssignments.completionData,
          taskId: onboardingTasks.id,
          taskTitle: onboardingTasks.title,
          taskDescription: onboardingTasks.description,
          taskType: onboardingTasks.taskType,
          required: onboardingTasks.required,
          orderSequence: onboardingTasks.orderSequence,
          estimatedMinutes: onboardingTasks.estimatedMinutes,
        })
        .from(employeeTaskAssignments)
        .leftJoin(onboardingTasks, eq(employeeTaskAssignments.onboardingTaskId, onboardingTasks.id))
        .where(eq(employeeTaskAssignments.employeeProfileId, input.employeeId))
        .orderBy(onboardingTasks.orderSequence, employeeTaskAssignments.assignedDate);

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

  // Start task (employee action)
  startTask: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the assignment belongs to the current user
      const userProfile = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' });
      }

      const assignment = await db
        .select({ 
          id: employeeTaskAssignments.id,
          employeeProfileId: employeeTaskAssignments.employeeProfileId 
        })
        .from(employeeTaskAssignments)
        .leftJoin(employeeProfiles, eq(employeeTaskAssignments.employeeProfileId, employeeProfiles.id))
        .where(and(
          eq(employeeTaskAssignments.id, input.assignmentId),
          eq(employeeProfiles.userId, userProfile[0].id)
        ))
        .limit(1);

      if (!assignment[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task assignment not found' });
      }

      return await db
        .update(employeeTaskAssignments)
        .set({
          status: 'in_progress',
          startedAt: new Date().getTime(),
        })
        .where(eq(employeeTaskAssignments.id, input.assignmentId))
        .returning();
    }),

  // Complete task
  completeTask: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      notes: z.string().optional(),
      completionData: z.string().optional(), // JSON string for form data, etc.
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the assignment belongs to the current user
      const userProfile = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' });
      }

      const assignment = await db
        .select({ 
          id: employeeTaskAssignments.id,
          employeeProfileId: employeeTaskAssignments.employeeProfileId 
        })
        .from(employeeTaskAssignments)
        .leftJoin(employeeProfiles, eq(employeeTaskAssignments.employeeProfileId, employeeProfiles.id))
        .where(and(
          eq(employeeTaskAssignments.id, input.assignmentId),
          eq(employeeProfiles.userId, userProfile[0].id)
        ))
        .limit(1);

      if (!assignment[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task assignment not found' });
      }

      const result = await db
        .update(employeeTaskAssignments)
        .set({
          status: 'completed',
          completedDate: new Date().getTime(),
          notes: input.notes,
          completionData: input.completionData,
        })
        .where(eq(employeeTaskAssignments.id, input.assignmentId))
        .returning();

      // Check if all required tasks are completed for this employee
      const employeeId = assignment[0].employeeProfileId;
      const allAssignments = await db
        .select({
          required: onboardingTasks.required,
          status: employeeTaskAssignments.status,
        })
        .from(employeeTaskAssignments)
        .leftJoin(onboardingTasks, eq(employeeTaskAssignments.onboardingTaskId, onboardingTasks.id))
        .where(eq(employeeTaskAssignments.employeeProfileId, employeeId));

      const requiredTasks = allAssignments.filter(a => a.required);
      const completedRequiredTasks = requiredTasks.filter(a => a.status === 'completed');

      // If all required tasks are completed, update employee status
      if (requiredTasks.length > 0 && completedRequiredTasks.length === requiredTasks.length) {
        await db
          .update(employeeProfiles)
          .set({
            onboardingStatus: 'completed',
            onboardingCompletedAt: new Date().getTime(),
          })
          .where(eq(employeeProfiles.id, employeeId));
      }

      return result;
    }),

  // Get all tasks for company (Admin/Manager)
  getAllTasks: protectedProcedure
    .query(async ({ ctx }) => {
      const userProfile = await db
        .select({ 
          companyId: profiles.companyId, 
          primaryRole: profiles.primaryRole 
        })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User profile not found' });
      }

      if (userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
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

  // Create new task
  createTask: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      taskType: z.enum(['form', 'document', 'acknowledgment', 'training', 'meeting']),
      required: z.boolean().default(true),
      orderSequence: z.number().optional(),
      estimatedMinutes: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userProfile = await db
        .select({ 
          id: profiles.id,
          companyId: profiles.companyId, 
          primaryRole: profiles.primaryRole 
        })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0] || userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      return await db
        .insert(onboardingTasks)
        .values({
          ...input,
          companyId: userProfile[0].companyId,
          createdBy: userProfile[0].id,
          isActive: true,
        })
        .returning();
    }),

  // Update task
  updateTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      taskType: z.enum(['form', 'document', 'acknowledgment', 'training', 'meeting']),
      required: z.boolean(),
      orderSequence: z.number().optional(),
      estimatedMinutes: z.number().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userProfile = await db
        .select({ primaryRole: profiles.primaryRole })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0] || userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      const { taskId, ...updateData } = input;
      
      return await db
        .update(onboardingTasks)
        .set(updateData)
        .where(eq(onboardingTasks.id, taskId))
        .returning();
    }),

  // Delete task
  deleteTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userProfile = await db
        .select({ primaryRole: profiles.primaryRole })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0] || userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      return await db
        .delete(onboardingTasks)
        .where(eq(onboardingTasks.id, input.taskId))
        .returning();
    }),

  // Assign specific tasks to employee
  assignTasksToEmployee: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      taskIds: z.array(z.string()),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      dueDate: z.number().optional(), // timestamp
    }))
    .mutation(async ({ ctx, input }) => {
      const userProfile = await db
        .select({ 
          id: profiles.id,
          companyId: profiles.companyId, 
          primaryRole: profiles.primaryRole 
        })
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      if (!userProfile[0] || userProfile[0].primaryRole === 'employee') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      // Verify tasks belong to the company
      const tasks = await db
        .select()
        .from(onboardingTasks)
        .where(and(
          eq(onboardingTasks.companyId, userProfile[0].companyId),
          inArray(onboardingTasks.id, input.taskIds)
        ));

      if (tasks.length !== input.taskIds.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Some tasks not found or not accessible' });
      }

      // Create assignments
      const assignments = tasks.map(task => ({
        employeeProfileId: input.employeeId,
        onboardingTaskId: task.id,
        status: 'pending' as const,
        priority: input.priority,
        dueDate: input.dueDate,
        assignedBy: userProfile[0].id,
      }));

      return await db
        .insert(employeeTaskAssignments)
        .values(assignments)
        .returning();
    }),
});