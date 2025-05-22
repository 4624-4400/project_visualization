
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Project, fetchProjects, addProject, deleteProject, isSupabaseConfigured } from '@/lib/supabase';
import { AlertCircle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

    // Check if this exact version already exists
    const existingVersion = allProjects.find(p => 
      p.name === finalProjectName && 
      p.version === versionNum && 
      p.subversion === subversionNum
    );

    if (existingVersion) {
      toast({
        title: "Version Exists",
        description: "This version already exists for this project",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header - Updated styling for title */}
      <header className="w-full py-8 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            地球online
          </h1>
          <h2 className="text-2xl mt-1 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            essay mod
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {!isSupabaseConfigured && (
          <Alert variant="default" className="mb-6 border-amber-500 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription>
              Supabase is not configured. Your data will be stored locally in this browser and will not sync across devices.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Chatbox Interface */}
        <Card className="mb-8 shadow-lg bg-white/90 backdrop-blur-sm border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl text-center">Project Management</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Project Selection */}
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  variant={isNewProject ? "default" : "outline"}
                  onClick={() => setIsNewProject(true)}
                  className="flex-1"
                >
                  New Project
                </Button>
                <Button
                  variant={!isNewProject ? "default" : "outline"}
                  onClick={() => setIsNewProject(false)}
                  className="flex-1"
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
              className="w-full text-lg py-6 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-200"
              disabled={loading}
            >
              {loading ? "Saving..." : "Add Project Version"}
            </Button>
          </CardContent>
        </Card>

        {/* Project History */}
        {allProjects.length > 0 && (
          <Card className="shadow-lg bg-white/90 backdrop-blur-sm border-0">
            <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
              <CardTitle className="text-xl text-center">Project History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="max-h-96 w-full">
                <div className="space-y-4 font-mono text-sm">
                  {Object.entries(groupedProjects).map(([projectName, projectVersions]) => (
                    <Collapsible 
                      key={projectName} 
                      open={expandedProjects[projectName]} 
                      className="border-b border-slate-200 pb-2 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <CollapsibleTrigger 
                          asChild
                          onClick={() => toggleProjectExpansion(projectName)}
                        >
                          <button className="flex items-center font-bold text-blue-600 text-base hover:underline py-2">
                            {expandedProjects[projectName] ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                            '{projectName}'
                          </button>
                        </CollapsibleTrigger>
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
                      <CollapsibleContent className="ml-6 space-y-1">
                        {projectVersions.map((project) => (
                          <div key={project.id} className="flex items-center justify-between text-slate-600 py-1">
                            <div className="flex">
                              <span className="text-slate-400 mr-2">
                                ├──
                              </span>
                              <span>
                                v{project.version}.{project.subversion}-'{project.comment}'.wip
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => handleDeleteVersion(project)}
                              disabled={deleteVersionLoading === `${project.name}-${project.version}-${project.subversion}`}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

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
