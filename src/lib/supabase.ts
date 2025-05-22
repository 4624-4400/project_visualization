
import { createClient } from '@supabase/supabase-js';

// Supabase connection info
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase credentials are available
const isMissingSupabaseCredentials = !supabaseUrl || !supabaseAnonKey;

// Initialize the Supabase client with fallback for local development
export const supabase = isMissingSupabaseCredentials
  ? createClient('https://placeholder-url.supabase.co', 'placeholder-key')
  : createClient(supabaseUrl, supabaseAnonKey);

// Flag to check if Supabase is properly configured
export const isSupabaseConfigured = !isMissingSupabaseCredentials;

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
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Using local data only.');
    return [];
  }

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
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Data will not be saved.');
    return false;
  }

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

// Function to delete a project
export const deleteProject = async (projectId: string): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Data will not be deleted from the server.');
    return false;
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
    
  if (error) {
    console.error('Error deleting project:', error);
    return false;
  }
  
  return true;
};
