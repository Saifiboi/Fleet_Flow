import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useProjects } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProjectForm from "@/components/forms/project-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FolderKanban, Plus, Edit, Eye, Trash2, Search, MapPin, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import type { ProjectWithCustomer } from "@shared/schema";

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingProject, setEditingProject] = useState<ProjectWithCustomer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useProjects();

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const filteredProjects = projects?.filter((project: ProjectWithCustomer) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      project.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      completed: "outline",
      on_hold: "secondary",
    };
    const labels: Record<string, string> = {
      active: "Active",
      completed: "Completed",
      on_hold: "On Hold",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const handleEdit = (project: ProjectWithCustomer) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6" data-testid="projects-page">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FolderKanban className="w-5 h-5" />
              <span>Projects</span>
            </CardTitle>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-project-button">
                  <Plus className="mr-2 w-4 h-4" />
                  Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProject ? "Edit Project" : "Add New Project"}
                  </DialogTitle>
                </DialogHeader>
                <ProjectForm 
                  project={editingProject} 
                  onSuccess={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-projects"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="rounded-md border hidden md:block">
            <ScrollArea className="h-[60vh]">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredProjects?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <FolderKanban className="w-12 h-12 text-muted-foreground" />
                          <p className="text-muted-foreground">No projects found</p>
                          {searchTerm || statusFilter !== "all" ? (
                            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Get started by adding your first project</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects?.map((project: Project) => (
                      <TableRow key={project.id} data-testid={`project-row-${project.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <FolderKanban className="text-primary w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{project.customer.name}</p>
                          {project.customer.contactName && (
                            <p className="text-xs text-muted-foreground">{project.customer.contactName}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <p className="text-sm text-foreground">{project.location}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <p className="text-sm text-foreground">
                              {format(new Date(project.startDate), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.endDate ? (
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <p className="text-sm text-foreground">
                                {format(new Date(project.endDate), "MMM dd, yyyy")}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Ongoing</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(project.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(project)}
                              data-testid={`edit-project-${project.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`view-project-${project.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <ConfirmDialog
                              title="Delete project"
                              description="Are you sure you want to delete this project? This will also delete all its assignments."
                              onConfirm={() => deleteProjectMutation.mutate(project.id)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  disabled={deleteProjectMutation.isPending}
                                  data-testid={`delete-project-${project.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="space-y-3 md:hidden">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </CardContent>
                  </Card>
                ))
              : filteredProjects?.length === 0
                ? (
                    <Card>
                      <CardContent className="p-6 text-center space-y-2">
                        <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">No projects found</p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm || statusFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Get started by adding your first project"}
                        </p>
                      </CardContent>
                    </Card>
                  )
                : filteredProjects?.map((project: Project) => (
                    <Card key={project.id} data-testid={`project-card-${project.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <FolderKanban className="text-primary w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                              )}
                              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>
                                  {project.customer.name}
                                  {project.customer.contactName ? ` • ${project.customer.contactName}` : ""}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span>{project.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(project)}
                              data-testid={`edit-project-${project.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`view-project-${project.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <ConfirmDialog
                              title="Delete project"
                              description="Are you sure you want to delete this project? This will also delete all its assignments."
                              onConfirm={() => deleteProjectMutation.mutate(project.id)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  disabled={deleteProjectMutation.isPending}
                                  data-testid={`delete-project-${project.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(project.startDate), "MMM dd, yyyy")}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {project.endDate ? format(new Date(project.endDate), "MMM dd, yyyy") : "Ongoing"}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm">{getStatusBadge(project.status)}</div>
                      </CardContent>
                    </Card>
                  ))}
          </div>

          {/* Summary */}
          {filteredProjects && filteredProjects.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredProjects.length} of {projects?.length || 0} projects
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
