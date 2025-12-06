import { supabase } from './supabaseClient';
import type { PipelineStage, InsertPipelineStage } from '@shared/schema';

export const DEFAULT_STAGES = [
    { name: 'New', type: 'system', order_index: 0 },
    { name: 'Reviewed', type: 'system', order_index: 1 },
    { name: 'Phone Screen', type: 'custom', order_index: 2 },
    { name: 'Interview', type: 'custom', order_index: 3 },
    { name: 'Offer', type: 'custom', order_index: 4 },
    { name: 'Hired', type: 'system', order_index: 5 },
    { name: 'Rejected', type: 'system', order_index: 6 },
];

export async function getPipelineStages(schoolId: string, jobId?: string): Promise<PipelineStage[]> {
    // Try to get job-specific stages first
    if (jobId) {
        const { data: jobStages, error: jobError } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('job_id', jobId)
            .order('order_index', { ascending: true });

        if (!jobError && jobStages && jobStages.length > 0) {
            return jobStages as PipelineStage[];
        }
    }

    // Fallback to school default stages
    const { data: schoolStages, error: schoolError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('school_id', schoolId)
        .is('job_id', null)
        .order('order_index', { ascending: true });

    if (schoolError) {
        console.error('Error fetching pipeline stages:', schoolError);
        return [];
    }

    // If no stages exist for the school, create defaults
    if (!schoolStages || schoolStages.length === 0) {
        return await createDefaultStages(schoolId);
    }

    return schoolStages as PipelineStage[];
}

export async function createDefaultStages(schoolId: string, jobId?: string): Promise<PipelineStage[]> {
    const stagesToInsert: InsertPipelineStage[] = DEFAULT_STAGES.map((stage) => ({
        school_id: schoolId,
        job_id: jobId || null,
        name: stage.name,
        order_index: stage.order_index,
        type: stage.type as 'system' | 'custom',
    }));

    const { data, error } = await supabase
        .from('pipeline_stages')
        .insert(stagesToInsert)
        .select()
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error creating default stages:', error);
        throw error;
    }

    return data as PipelineStage[];
}

export async function updateStageOrder(stages: PipelineStage[]) {
    const updates = stages.map((stage, index) => ({
        id: stage.id,
        order_index: index,
    }));

    const { error } = await supabase
        .from('pipeline_stages')
        .upsert(updates, { onConflict: 'id' });

    if (error) throw error;
}

export async function addStage(stage: InsertPipelineStage) {
    const { data, error } = await supabase
        .from('pipeline_stages')
        .insert(stage)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteStage(stageId: string) {
    const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

    if (error) throw error;
}
