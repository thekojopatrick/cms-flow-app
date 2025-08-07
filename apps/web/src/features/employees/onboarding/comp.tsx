"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Plus,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Eye,
  Send,
  UserPlus,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import SectionStatsCard from "@/components/section-stats-card";
import { IconTrendingUp } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";

export default function OnboardingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "not_started" | "invited" | "in_progress" | "completed"
  >("all");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );

  const { data: session } = authClient.useSession();

  // Query for employees with the updated API
  const {
    data: employees,
    refetch,
    isLoading,
  } = useQuery(
    trpc.onboarding.getEmployees.queryOptions({
      onboardingStatus: statusFilter === "all" ? undefined : statusFilter,
      department: departmentFilter || undefined,
    })
  );

  // Mutations
  const createEmployeeMutation = useMutation(
    trpc.onboarding.createEmployee.mutationOptions({
      onSuccess: () => {
        toast.success("New hire added successfully!");
        setIsCreateDialogOpen(false);
        resetForm();
        refetch();
      },
      onError: (error) => {
        console.log({ error });

        toast.error(error.message || "Failed to create employee");
      },
    })
  );

  const sendInvitationMutation = useMutation(
    trpc.onboarding.sendInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation sent successfully!");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send invitation");
      },
    })
  );

  // Form state for creating employees
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    personalEmail: "",
    workEmail: "",
    phoneNumber: "",
    dateOfBirth: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",

    // Work Details
    employeeId: "",
    startDate: "",
    department: "",
    position: "",
    employmentType: "full_time" as const,

    // Compensation
    salary: "",
    currency: "USD",
    payFrequency: "monthly" as const,

    // Management
    managerId: "",
    accessLevel: "general" as const,

    // Options
    assignDefaultTasks: true,
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      personalEmail: "",
      workEmail: "",
      phoneNumber: "",
      dateOfBirth: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      employeeId: "",
      startDate: "",
      department: "",
      position: "",
      employmentType: "full_time",
      salary: "",
      currency: "USD",
      payFrequency: "monthly",
      managerId: "",
      accessLevel: "general",
      assignDefaultTasks: true,
    });
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      salary: formData.salary ? parseFloat(formData.salary) : undefined,
      managerId: session?.user.id,
    };

    createEmployeeMutation.mutate(payload);
  };

  const handleSendInvitation = (employeeId: string) => {
    sendInvitationMutation.mutate({ employeeId });
  };

  // Filter employees based on search and filters
  const filteredEmployees =
    employees?.filter((employee) => {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${employee.firstName?.toLowerCase() || ""} ${
        employee.lastName?.toLowerCase() || ""
      }`.toLowerCase();
      const position = employee.position?.toLowerCase() || "";
      const department = employee.department?.toLowerCase() || "";
      const personalEmail = employee.personlEmail?.toLowerCase() || "";
      const workEmail = employee.workEmail?.toLowerCase() || "";

      return (
        fullName.includes(searchLower) ||
        position.includes(searchLower) ||
        department.includes(searchLower) ||
        personalEmail.includes(searchLower) ||
        workEmail.includes(searchLower)
      );
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "invited":
        return "bg-purple-100 text-purple-800";
      case "not_started":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "invited":
        return <Send className="h-4 w-4 text-purple-600" />;
      case "not_started":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const stats = {
    total: employees?.length ?? 0,
    notStarted:
      employees?.filter((e) => e.onboardingStatus === "not_started").length ??
      0,
    invited:
      employees?.filter((e) => e.onboardingStatus === "invited").length ?? 0,
    inProgress:
      employees?.filter((e) => e.onboardingStatus === "in_progress").length ??
      0,
    completed:
      employees?.filter((e) => e.onboardingStatus === "completed").length ?? 0,
  };

  // Get unique departments for filter
  const departments =
    Array.from(new Set(employees?.map((e) => e.department).filter(Boolean))) ||
    [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Employee Onboarding
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Manage and track employee onboarding progress
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEmployee} className="space-y-6">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="work">Work Details</TabsTrigger>
                  <TabsTrigger value="compensation">Compensation</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="personalEmail">Personal Email *</Label>
                    <Input
                      id="personal-email"
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          personalEmail: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="workEmail">Work Email *</Label>
                    <Input
                      id="work-email"
                      type="email"
                      value={formData.workEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          workEmail: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phoneNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dateOfBirth: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="emergencyContactName">
                        Emergency Contact Name
                      </Label>
                      <Input
                        id="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            emergencyContactName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="emergencyContactPhone">
                        Emergency Contact Phone
                      </Label>
                      <Input
                        id="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            emergencyContactPhone: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="work" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="position">Position *</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            position: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="department">Department *</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="employmentType">Employment Type</Label>
                      <Select
                        value={formData.employmentType}
                        onValueChange={(value: any) =>
                          setFormData((prev) => ({
                            ...prev,
                            employmentType: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="employeeId">Employee ID (Optional)</Label>
                    <Input
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          employeeId: e.target.value,
                        }))
                      }
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="compensation" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-2">
                      <Label htmlFor="salary">Annual Salary</Label>
                      <Input
                        id="salary"
                        type="number"
                        value={formData.salary}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            salary: e.target.value,
                          }))
                        }
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, currency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="CAD">CAD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="payFrequency">Pay Frequency</Label>
                    <Select
                      value={formData.payFrequency}
                      onValueChange={(value: any) =>
                        setFormData((prev) => ({
                          ...prev,
                          payFrequency: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="accessLevel">Access Level</Label>
                    <Select
                      value={formData.accessLevel}
                      onValueChange={(value: any) =>
                        setFormData((prev) => ({ ...prev, accessLevel: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="top-level">Top level</SelectItem>
                        <SelectItem value="IT">Support</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="assignDefaultTasks"
                      checked={formData.assignDefaultTasks}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          assignDefaultTasks: e.target.checked,
                        }))
                      }
                    />
                    <Label htmlFor="assignDefaultTasks">
                      Automatically assign default onboarding tasks
                    </Label>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createEmployeeMutation.isPending}
                >
                  {createEmployeeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {createEmployeeMutation.isPending
                    ? "Creating..."
                    : "Create Employee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        <SectionStatsCard
          title="Total Employees"
          value={stats.total.toString()}
          trend="up"
          trendValue="+12.5%"
          trendIcon={<IconTrendingUp />}
          description="All employees"
        />

        <SectionStatsCard
          title="Not Started"
          value={stats.notStarted.toString()}
          trend="up"
          trendValue="+2"
          trendIcon={<IconTrendingUp />}
          description="Awaiting setup"
        />

        <SectionStatsCard
          title="Invited"
          value={stats.invited.toString()}
          trend="up"
          trendValue="+3"
          trendIcon={<IconTrendingUp />}
          description="Invitation sent"
        />

        <SectionStatsCard
          title="In Progress"
          value={stats.inProgress.toString()}
          trend="up"
          trendValue="+5"
          trendIcon={<IconTrendingUp />}
          description="Currently onboarding"
        />

        <SectionStatsCard
          title="Completed"
          value={stats.completed.toString()}
          trend="up"
          trendValue="+8"
          trendIcon={<IconTrendingUp />}
          description="Onboarding finished"
        />
      </div>

      {/* Filters */}
      <div className="px-4">
        <Card className="@container/card shadow-none">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {departments.length > 0 && (
                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <div className="px-4">
        <Card className="@container/card shadow-none">
          <CardHeader>
            <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No employees found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "Get started by adding a new employee."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-800">
                          {employee.firstName?.[0]?.toUpperCase() || ""}
                          {employee.lastName?.[0]?.toUpperCase() || ""}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </p>
                          {employee.employeeId && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {employee.employeeId}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {employee.position} • {employee.department}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            Started:{" "}
                            {employee.startDate
                              ? format(
                                  new Date(employee.startDate),
                                  "MMM dd, yyyy"
                                )
                              : "Not set"}
                          </span>
                          {employee.invitationSentAt && (
                            <span>
                              Invited:{" "}
                              {format(
                                new Date(employee.invitationSentAt),
                                "MMM dd"
                              )}
                            </span>
                          )}
                          {employee.firstLoginAt && (
                            <span>
                              First login:{" "}
                              {format(
                                new Date(employee.firstLoginAt),
                                "MMM dd"
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(employee.onboardingStatus || "")}
                        <Badge
                          className={getStatusColor(
                            employee.onboardingStatus || ""
                          )}
                        >
                          {employee.onboardingStatus?.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {employee.onboardingStatus === "not_started" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvitation(employee.id)}
                            disabled={sendInvitationMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send Invite
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Progress
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
