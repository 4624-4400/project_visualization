import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Project, fetchProjects, addProject, deleteProject, updateProjectName, updateVersionComment, isSupabaseConfigured } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Trash2, Edit, Download, Upload, CheckCircle, Circle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Index = () => {
  const [projectName, setProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [subversion, setSubversion] = useState<string>('');
  const [editComment, setEditComment] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isNewProject, setIsNewProject] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteVersionLoading, setDeleteVersionLoading] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editVersionComment, setEditVersionComment] = useState('');
  const [completedProjects, setCompletedProjects] = useState<Set<string>>(new Set());
  const [expandedCompletedProjects, setExpandedCompletedProjects] = useState<Record<string, boolean>>({});

  // Load projects from Supabase on component mount
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        // Try to fetch from Supabase
        const projectData = await fetchProjects();
        setProjects(projectData);
        
        // If Supabase is not configured, load from localStorage as fallback
        if (!isSupabaseConfigured) {
          const savedProjects = localStorage.getItem('projects');
          if (savedProjects) {
            const parsedProjects = JSON.parse(savedProjects).map((project: any) => ({
              ...project,
              timestamp: new Date(project.timestamp)
            }));
            setLocalProjects(parsedProjects);
          }
        }
        
        // Load completed projects from localStorage
        const savedCompletedProjects = localStorage.getItem('completedProjects');
        if (savedCompletedProjects) {
          const completedProjectsArray: string[] = JSON.parse(savedCompletedProjects);
          setCompletedProjects(new Set(completedProjectsArray));
        }
        
        setDataLoaded(true);
      } catch (error) {
        console.error('Failed to load projects:', error);
        toast({
          title: "Error Loading Data",
          description: "Could not load your projects. Please check your connection.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Get unique project names for selection
  const allProjects = isSupabaseConfigured ? projects : localProjects;
  const uniqueProjects = Array.from(new Set(allProjects.map(p => p.name)));

  // Get latest version for selected project
  const getLatestVersion = (projectName: string) => {
    const projectVersions = allProjects.filter(p => p.name === projectName);
    if (projectVersions.length === 0) return null;
    
    // Sort by version and subversion to get the latest
    const sortedVersions = projectVersions.sort((a, b) => {
      if (a.version !== b.version) {
        return b.version - a.version; // Descending order
      }
      return b.subversion - a.subversion; // Descending order
    });
    
    return sortedVersions[0];
  };

  // Get latest timestamp for a project (for sorting)
  const getLatestProjectTimestamp = (projectName: string) => {
    const projectVersions = allProjects.filter(p => p.name === projectName);
    if (projectVersions.length === 0) return new Date(0);
    
    return new Date(Math.max(...projectVersions.map(p => p.timestamp.getTime())));
  };

  // Toggle completed status for a project
  const toggleProjectCompleted = (projectName: string) => {
    const newCompletedProjects = new Set<string>(completedProjects);
    if (newCompletedProjects.has(projectName)) {
      newCompletedProjects.delete(projectName);
    } else {
      newCompletedProjects.add(projectName);
    }
    setCompletedProjects(newCompletedProjects);
    localStorage.setItem('completedProjects', JSON.stringify(Array.from(newCompletedProjects)));
  };

  // Export data to JSON file
  const handleExportData = () => {
    const dataToExport = {
      projects: isSupabaseConfigured ? projects : localProjects,
      completedProjects: Array.from(completedProjects)
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `essay-mod-projects-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    toast({
      title: "Data Exported",
      description: "Your project data has been downloaded as a JSON file",
    });
  };

  // Import data from JSON file
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // Handle both old format (just projects array) and new format (object with projects and completedProjects)
        let projectsData, completedProjectsData;
        
        if (Array.isArray(importedData)) {
          // Old format - just projects array
          projectsData = importedData;
          completedProjectsData = [];
        } else {
          // New format - object with projects and completedProjects
          projectsData = importedData.projects || [];
          completedProjectsData = importedData.completedProjects || [];
        }

        // Convert timestamp strings back to Date objects
        const processedData = projectsData.map((project: any) => ({
          ...project,
          timestamp: new Date(project.timestamp)
        }));

        if (isSupabaseConfigured) {
          setProjects(processedData);
        } else {
          setLocalProjects(processedData);
          localStorage.setItem('projects', JSON.stringify(processedData));
        }

        // Set completed projects
        const newCompletedProjects = new Set(completedProjectsData);
        setCompletedProjects(newCompletedProjects);
        localStorage.setItem('completedProjects', JSON.stringify(completedProjectsData));

        toast({
          title: "Data Imported",
          description: `Successfully imported ${processedData.length} project entries`,
        });
      } catch (error) {
        console.error('Error importing data:', error);
        toast({
          title: "Import Failed",
          description: "The file format is not valid. Please check your file and try again.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsText(file);
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const handleSubmit = async () => {
    const finalProjectName = isNewProject ? projectName : selectedProject;
    
    if (!finalProjectName || version === undefined || version === null || version === '' || subversion === undefined || subversion === null || subversion === '' || !editComment) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const versionNum = parseInt(version);
    const subversionNum = parseInt(subversion);

    if (versionNum < 0 || versionNum > 10) {
      toast({
        title: "Invalid Version",
        description: "Version must be between 0 and 10",
        variant: "destructive"
      });
      return;
    }

    if (subversionNum < 0 || subversionNum > 20) {
      toast({
        title: "Invalid Subversion",
        description: "Subversion must be between 0 and 20",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const newProject: Project = {
      id: Date.now().toString(),
      name: finalProjectName,
      version: versionNum,
      subversion: subversionNum,
      comment: editComment,
      timestamp: new Date()
    };

    try {
      let saved = false;
      
      // Try to save to Supabase if configured
      if (isSupabaseConfigured) {
        saved = await addProject(newProject);
      }
      
      if (isSupabaseConfigured && saved) {
        setProjects([...projects, newProject]);
      } else {
        // Fallback to localStorage if Supabase is not available or save failed
        const updatedProjects = [...localProjects, newProject];
        setLocalProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        saved = true;
      }
      
      if (saved) {
        // Reset form
        setProjectName('');
        setSelectedProject('');
        setVersion('');
        setSubversion('');
        setEditComment('');
        
        // Expand the project in the list
        setExpandedProjects(prev => ({
          ...prev,
          [finalProjectName]: true
        }));
        
        toast({
          title: "Project Added",
          description: `${finalProjectName} v${versionNum}.${subversionNum} has been added successfully`,
        });
      } else {
        throw new Error("Failed to save project");
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle project deletion
  const handleDeleteProject = async (projectName: string) => {
    setDeleteLoading(projectName);
    
    try {
      const projectsToDelete = allProjects.filter(p => p.name === projectName);
      let deletionSuccess = true;
      
      if (isSupabaseConfigured) {
        // Delete from Supabase
        for (const project of projectsToDelete) {
          const success = await deleteProject(project.id);
          if (!success) {
            deletionSuccess = false;
          }
        }
        
        if (deletionSuccess) {
          setProjects(projects.filter(p => p.name !== projectName));
        }
      } else {
        // Delete from localStorage
        const updatedProjects = localProjects.filter(p => p.name !== projectName);
        setLocalProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
      }
      
      if (deletionSuccess) {
        setSelectedProject('');
        toast({
          title: "Project Deleted",
          description: `${projectName} has been deleted successfully`,
        });
      } else {
        throw new Error("Failed to delete project");
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  // Handle version deletion
  const handleDeleteVersion = async (project: Project) => {
    const versionIdentifier = `${project.name}-${project.version}-${project.subversion}`;
    setDeleteVersionLoading(versionIdentifier);
    
    try {
      let deletionSuccess = false;
      
      if (isSupabaseConfigured) {
        // Delete from Supabase
        deletionSuccess = await deleteProject(project.id);
        
        if (deletionSuccess) {
          setProjects(projects.filter(p => p.id !== project.id));
        }
      } else {
        // Delete from localStorage
        const updatedProjects = localProjects.filter(p => p.id !== project.id);
        setLocalProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        deletionSuccess = true;
      }
      
      if (deletionSuccess) {
        toast({
          title: "Version Deleted",
          description: `${project.name} v${project.version}.${project.subversion} has been deleted successfully`,
        });
      } else {
        throw new Error("Failed to delete version");
      }
    } catch (error) {
      console.error('Error deleting version:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your version. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteVersionLoading(null);
    }
  };

  // Toggle project expansion
  const toggleProjectExpansion = (projectName: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  // Toggle completed project expansion
  const toggleCompletedProjectExpansion = (projectName: string) => {
    setExpandedCompletedProjects(prev => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  // Group projects by name and sort versions
  const groupedProjects = allProjects.reduce((acc, project) => {
    if (!acc[project.name]) {
      acc[project.name] = [];
    }
    acc[project.name].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  // Sort versions within each project
  Object.keys(groupedProjects).forEach(projectName => {
    groupedProjects[projectName].sort((a, b) => {
      if (a.version !== b.version) {
        return a.version - b.version;
      }
      return a.subversion - b.subversion;
    });
  });

  // Separate active and completed projects, then sort by latest update
  const activeProjectNames = Object.keys(groupedProjects)
    .filter(name => !completedProjects.has(name))
    .sort((a, b) => getLatestProjectTimestamp(b).getTime() - getLatestProjectTimestamp(a).getTime());
  
  const completedProjectNames = Object.keys(groupedProjects)
    .filter(name => completedProjects.has(name))
    .sort((a, b) => getLatestProjectTimestamp(b).getTime() - getLatestProjectTimestamp(a).getTime());

  // Render project list helper function
  const renderProjectList = (projectNames: string[], isCompleted: boolean = false) => {
    const expansionState = isCompleted ? expandedCompletedProjects : expandedProjects;
    const toggleExpansion = isCompleted ? toggleCompletedProjectExpansion : toggleProjectExpansion;

    return projectNames.map((projectName) => {
      const projectVersions = groupedProjects[projectName];
      const isExpanded = expansionState[projectName];
      const projectCreationDate = projectVersions[0]?.timestamp;
      
      return (
        <Collapsible 
          key={projectName} 
          open={isExpanded} 
          className="border-b border-slate-200 pb-2 last:border-b-0"
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger 
              asChild
              onClick={() => toggleExpansion(projectName)}
            >
              <button className="flex items-center font-bold text-blue-600 text-base hover:underline py-2 flex-1">
                {isExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    {editingProject === projectName ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editProjectName}
                          onChange={(e) => setEditProjectName(e.target.value)}
                          className="h-6 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveProjectEdit();
                            if (e.key === 'Escape') handleCancelProjectEdit();
                          }}
                          autoFocus
                        />
                        <Button size="sm" className="h-6 px-2" onClick={handleSaveProjectEdit}>Save</Button>
                        <Button size="sm" variant="outline" className="h-6 px-2" onClick={handleCancelProjectEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <span>{projectName}</span>
                        {!isExpanded && projectCreationDate && (
                          <span className="text-xs text-slate-400 font-normal">
                            ({projectCreationDate.toLocaleDateString()})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>
            {!isExpanded && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProjectCompleted(projectName);
                  }}
                  title={completedProjects.has(projectName) ? "Mark as active" : "Mark as completed"}
                >
                  {completedProjects.has(projectName) ? 
                    <CheckCircle className="h-4 w-4 text-green-500" /> : 
                    <Circle className="h-4 w-4 text-gray-400" />
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProject(projectName);
                  }}
                  disabled={editingProject === projectName}
                >
                  <Edit className="h-4 w-4 text-blue-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm" 
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(projectName);
                  }}
                  disabled={deleteLoading === projectName}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </div>
          <CollapsibleContent className="ml-6 space-y-1">
            {projectVersions.map((project) => {
              const versionId = `${project.name}-${project.version}-${project.subversion}`;
              return (
                <div key={project.id} className="flex items-center justify-between text-slate-600 py-1">
                  <div className="flex items-center flex-1">
                    <span className="text-slate-400 mr-2">
                      ├──
                    </span>
                    {editingVersion === versionId ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span>v{project.version}.{project.subversion}-</span>
                        <Input
                          value={editVersionComment}
                          onChange={(e) => setEditVersionComment(e.target.value)}
                          className="h-6 text-sm flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveVersionEdit(project);
                            if (e.key === 'Escape') handleCancelVersionEdit();
                          }}
                          autoFocus
                        />
                        <span>.wip ({project.timestamp.toLocaleDateString()})</span>
                        <Button size="sm" className="h-6 px-2" onClick={() => handleSaveVersionEdit(project)}>Save</Button>
                        <Button size="sm" variant="outline" className="h-6 px-2" onClick={handleCancelVersionEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <span>
                        v{project.version}.{project.subversion}-{project.comment}.wip 
                        <span className="ml-2 text-xs text-slate-400">
                          ({project.timestamp.toLocaleDateString()})
                        </span>
                      </span>
                    )}
                  </div>
                  {editingVersion !== versionId && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => handleEditVersion(project)}
                      >
                        <Edit className="h-3 w-3 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => handleDeleteVersion(project)}
                        disabled={deleteVersionLoading === versionId}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      );
    });
  };

  // Handle project name edit
  const handleEditProject = (projectName: string) => {
    setEditingProject(projectName);
    setEditProjectName(projectName);
  };

  const handleSaveProjectEdit = async () => {
    if (!editProjectName.trim() || !editingProject || editProjectName === editingProject) {
      setEditingProject(null);
      setEditProjectName('');
      return;
    }
    
    setLoading(true);
    
    try {
      let updateSuccess = false;
      
      if (isSupabaseConfigured) {
        // Update in Supabase
        updateSuccess = await updateProjectName(editingProject, editProjectName);
        
        if (updateSuccess) {
          // Update local state
          setProjects(prevProjects => 
            prevProjects.map(project => 
              project.name === editingProject 
                ? { ...project, name: editProjectName }
                : project
            )
          );
        }
      } else {
        // Update in localStorage
        const updatedProjects = localProjects.map(project => 
          project.name === editingProject 
            ? { ...project, name: editProjectName }
            : project
        );
        setLocalProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        updateSuccess = true;
      }
      
      if (updateSuccess) {
        // Update selectedProject if it was the one being edited
        if (selectedProject === editingProject) {
          setSelectedProject(editProjectName);
        }
        
        toast({
          title: "Project Updated",
          description: `Project name changed from "${editingProject}" to "${editProjectName}"`,
        });
      } else {
        throw new Error("Failed to update project name");
      }
    } catch (error) {
      console.error('Error updating project name:', error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the project name. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setEditingProject(null);
      setEditProjectName('');
    }
  };

  const handleCancelProjectEdit = () => {
    setEditingProject(null);
    setEditProjectName('');
  };

  // Handle version comment edit
  const handleEditVersion = (project: Project) => {
    const versionId = `${project.name}-${project.version}-${project.subversion}`;
    setEditingVersion(versionId);
    setEditVersionComment(project.comment);
  };

  const handleSaveVersionEdit = async (project: Project) => {
    if (!editVersionComment.trim() || editVersionComment === project.comment) {
      setEditingVersion(null);
      setEditVersionComment('');
      return;
    }
    
    setLoading(true);
    
    try {
      let updateSuccess = false;
      
      if (isSupabaseConfigured) {
        // Update in Supabase
        updateSuccess = await updateVersionComment(project.id, editVersionComment);
        
        if (updateSuccess) {
          // Update local state
          setProjects(prevProjects => 
            prevProjects.map(p => 
              p.id === project.id 
                ? { ...p, comment: editVersionComment }
                : p
            )
          );
        }
      } else {
        // Update in localStorage
        const updatedProjects = localProjects.map(p => 
          p.id === project.id 
            ? { ...p, comment: editVersionComment }
            : p
        );
        setLocalProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        updateSuccess = true;
      }
      
      if (updateSuccess) {
        toast({
          title: "Version Updated",
          description: `Version comment updated to "${editVersionComment}"`,
        });
      } else {
        throw new Error("Failed to update version comment");
      }
    } catch (error) {
      console.error('Error updating version comment:', error);
      toast({
        title: "Update Failed", 
        description: "There was an error updating the version comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setEditingVersion(null);
      setEditVersionComment('');
    }
  };

  const handleCancelVersionEdit = () => {
    setEditingVersion(null);
    setEditVersionComment('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-yellow-50 to-blue-50">
      {/* Header - Updated styling for title with new color theme */}
      <header className="w-full py-8 bg-white/80 backdrop-blur-sm border-b border-yellow-200">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-blue-500 to-yellow-500 bg-clip-text text-transparent">
            地球online
          </h1>
          <h2 className="text-2xl mt-1 bg-gradient-to-r from-blue-400 to-yellow-400 bg-clip-text text-transparent">
            essay mod
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        
        {/* Chatbox Interface */}
        <Card className="mb-8 shadow-lg bg-white/90 backdrop-blur-sm border-0">
          <CardHeader className="bg-gradient-to-r from-blue-400 to-yellow-400 text-white rounded-t-lg">
            <CardTitle className="text-2xl text-center">Project Management</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Project Selection */}
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  variant={isNewProject ? "default" : "outline"}
                  onClick={() => setIsNewProject(true)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  New Project
                </Button>
                <Button
                  variant={!isNewProject ? "default" : "outline"}
                  onClick={() => setIsNewProject(false)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  disabled={uniqueProjects.length === 0}
                >
                  Existing Project
                </Button>
              </div>

              {isNewProject ? (
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="text-lg"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="existingProject">Select Existing Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="text-lg">
                        <SelectValue placeholder="Choose a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueProjects.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Latest version display */}
                    {selectedProject && (() => {
                      const latestVersion = getLatestVersion(selectedProject);
                      return latestVersion ? (
                        <p className="text-sm text-gray-500 mt-1">
                          Latest version: v{latestVersion.version}.{latestVersion.subversion} - {latestVersion.comment}
                        </p>
                      ) : null;
                    })()}
                  </div>
                  
                  {selectedProject && (
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteProject(selectedProject)}
                        disabled={deleteLoading === selectedProject}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleteLoading === selectedProject ? "Deleting..." : "Delete Project"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Version Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version (0-10)</Label>
                <Select value={version} onValueChange={setVersion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Version" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subversion">Subversion (0-20)</Label>
                <Select value={subversion} onValueChange={setSubversion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Subversion" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 21 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Version Name */}
            <div className="space-y-2">
              <Label htmlFor="editComment">Version Name</Label>
              <Textarea
                id="editComment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Name this version..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              className="w-full text-lg py-6 bg-gradient-to-r from-blue-500 to-yellow-500 hover:from-blue-600 hover:to-yellow-600 transition-all duration-200"
              disabled={loading}
            >
              {loading ? "Saving..." : "Add Project Version"}
            </Button>
          </CardContent>
        </Card>

        {/* Active Project History */}
        {activeProjectNames.length > 0 && (
          <Card className="mb-6 shadow-lg bg-white/90 backdrop-blur-sm border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-yellow-500 text-white rounded-t-lg">
              <CardTitle className="text-xl text-center">Active Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="max-h-96 w-full">
                <div className="space-y-4 font-mono text-sm">
                  {renderProjectList(activeProjectNames, false)}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Completed Projects */}
        {completedProjectNames.length > 0 && (
          <Card className="mb-6 shadow-lg bg-white/90 backdrop-blur-sm border-0">
            <CardHeader className="bg-gradient-to-r from-green-600 to-blue-500 text-white rounded-t-lg">
              <CardTitle className="text-xl text-center">Completed Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="max-h-96 w-full">
                <div className="space-y-4 font-mono text-sm">
                  {renderProjectList(completedProjectNames, true)}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Data Management Section - Moved below and made smaller */}
        <Card className="shadow-lg bg-white/90 backdrop-blur-sm border-0">
          <CardHeader className="bg-gradient-to-r from-blue-400 to-yellow-400 text-white rounded-t-lg">
            <CardTitle className="text-lg text-center">Data Management</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleExportData}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
                disabled={allProjects.length === 0}
                size="sm"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-file"
                />
                <Button 
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600"
                  size="sm"
                >
                  <Upload className="h-4 w-4" />
                  Import Data
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center mt-2">
              Export your data to save it as a file on your computer, or import previously saved data.
            </p>
          </CardContent>
        </Card>

        {!dataLoaded && loading && (
          <div className="text-center py-10">
            <p className="text-slate-600">Loading your projects...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
