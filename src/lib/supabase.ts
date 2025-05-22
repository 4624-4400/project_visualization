
import { createClient } from '@supabase/supabase-js';

// Supabase connection info
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type for our project data structure
export interface Project {
  id: string;
  name: string;
  version: number;
  subversion: number;
  comment: string;
  timestamp: Date;
}

// Function to fetch all projects
export const fetchProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name')
    .order('version')
    .order('subversion');
    
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    ...item,
    timestamp: new Date(item.timestamp)
  }));
};

// Function to add a new project
export const addProject = async (project: Omit<Project, 'timestamp'> & { timestamp: Date }): Promise<boolean> => {
  // Convert Date to ISO string for Supabase
  const projectData = {
    ...project,
    timestamp: project.timestamp.toISOString()
  };

  const { error } = await supabase
    .from('projects')
    .insert([projectData]);
    
  if (error) {
    console.error('Error adding project:', error);
    return false;
  }
  
  return true;
};
