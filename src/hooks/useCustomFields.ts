import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

export interface CustomField {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  field_key: string;
  description?: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select' | 'email' | 'url' | 'textarea' | 'currency' | 'percentage';
  is_required: boolean;
  field_config: Record<string, any>;
  applies_to: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  workspace_id: string;
  custom_field_id: string;
  entity_type: 'project' | 'task' | 'portfolio' | 'goal';
  entity_id: string;
  text_value?: string;
  number_value?: number;
  boolean_value?: boolean;
  date_value?: string;
  json_value?: any;
  created_at: string;
  updated_at: string;
  custom_field?: CustomField;
}

interface CreateCustomFieldData {
  name: string;
  field_key: string;
  description?: string;
  field_type: CustomField['field_type'];
  is_required?: boolean;
  field_config?: Record<string, any>;
  applies_to: string[];
  display_order?: number;
}

interface UpdateCustomFieldData {
  name?: string;
  field_key?: string;
  description?: string;
  field_type?: CustomField['field_type'];
  is_required?: boolean;
  field_config?: Record<string, any>;
  applies_to?: string[];
  display_order?: number;
  is_active?: boolean;
}

interface SetFieldValueData {
  custom_field_id: string;
  entity_type: CustomFieldValue['entity_type'];
  entity_id: string;
  value: any;
}

export function useCustomFields() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch custom fields
  const fetchCustomFields = useCallback(async (entityType?: string) => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = (supabase as any)
        .from('custom_fields')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (entityType) {
        query = query.contains('applies_to', [entityType]);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCustomFields(data || []);
    } catch (err: any) {
      console.error('Error fetching custom fields:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch custom fields',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, toast]);

  // Create custom field
  const createCustomField = useCallback(async (fieldData: CreateCustomFieldData) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('custom_fields')
        .insert({
          ...fieldData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          field_config: fieldData.field_config || {},
        })
        .select()
        .single();

      if (error) throw error;

      await fetchCustomFields();
      toast({
        title: 'Custom Field Created',
        description: 'Custom field has been created successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating custom field:', err);
      toast({
        title: 'Error',
        description: err.message.includes('unique constraint')
          ? 'Field key must be unique'
          : 'Failed to create custom field',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, user?.id, fetchCustomFields, toast]);

  // Update custom field
  const updateCustomField = useCallback(async (fieldId: string, updates: UpdateCustomFieldData) => {
    try {
      const { data, error } = await (supabase as any)
        .from('custom_fields')
        .update(updates)
        .eq('id', fieldId)
        .select()
        .single();

      if (error) throw error;

      await fetchCustomFields();
      toast({
        title: 'Custom Field Updated',
        description: 'Custom field has been updated successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating custom field:', err);
      toast({
        title: 'Error',
        description: 'Failed to update custom field',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchCustomFields, toast]);

  // Delete custom field
  const deleteCustomField = useCallback(async (fieldId: string) => {
    try {
      // Soft delete by setting is_active to false
      const { error } = await (supabase as any)
        .from('custom_fields')
        .update({ is_active: false })
        .eq('id', fieldId);

      if (error) throw error;

      await fetchCustomFields();
      toast({
        title: 'Custom Field Deleted',
        description: 'Custom field has been deleted successfully',
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting custom field:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete custom field',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchCustomFields, toast]);

  // Get custom field values for an entity
  const getEntityFieldValues = useCallback(async (entityType: string, entityId: string) => {
    if (!currentWorkspace?.id) return [];

    try {
      const { data, error } = await (supabase as any)
        .from('custom_field_values')
        .select(`
          *,
          custom_field:custom_fields(*)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;

      return data || [];
    } catch (err: any) {
      console.error('Error fetching entity field values:', err);
      return [];
    }
  }, [currentWorkspace?.id]);

  // Set custom field value
  const setFieldValue = useCallback(async (data: SetFieldValueData) => {
    if (!currentWorkspace?.id) return null;

    try {
      // Find the custom field to determine the correct value column
      const customField = customFields.find(f => f.id === data.custom_field_id);
      if (!customField) {
        throw new Error('Custom field not found');
      }

      // Prepare the value object based on field type
      const valueData: any = {
        workspace_id: currentWorkspace.id,
        custom_field_id: data.custom_field_id,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        text_value: null,
        number_value: null,
        boolean_value: null,
        date_value: null,
        json_value: null,
      };

      // Set the appropriate value column based on field type
      switch (customField.field_type) {
        case 'text':
        case 'email':
        case 'url':
        case 'textarea':
          valueData.text_value = data.value;
          break;
        case 'number':
        case 'currency':
        case 'percentage':
          valueData.number_value = parseFloat(data.value) || 0;
          break;
        case 'boolean':
          valueData.boolean_value = Boolean(data.value);
          break;
        case 'date':
          valueData.date_value = data.value;
          break;
        case 'select':
          valueData.text_value = data.value;
          break;
        case 'multi_select':
          valueData.json_value = Array.isArray(data.value) ? data.value : [data.value];
          break;
        default:
          valueData.json_value = data.value;
      }

      const { data: result, error } = await (supabase as any)
        .from('custom_field_values')
        .upsert(valueData, {
          onConflict: 'custom_field_id,entity_type,entity_id'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Field Updated',
        description: 'Custom field value has been updated',
      });

      return result;
    } catch (err: any) {
      console.error('Error setting field value:', err);
      toast({
        title: 'Error',
        description: 'Failed to update field value',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, customFields, toast]);

  // Get formatted value for display
  const getFormattedValue = useCallback((field: CustomField, fieldValue: CustomFieldValue) => {
    if (!fieldValue) return '';

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'textarea':
      case 'select':
        return fieldValue.text_value || '';
      case 'number':
        return fieldValue.number_value?.toString() || '0';
      case 'currency':
        return fieldValue.number_value ? `$${fieldValue.number_value.toFixed(2)}` : '$0.00';
      case 'percentage':
        return fieldValue.number_value ? `${fieldValue.number_value}%` : '0%';
      case 'boolean':
        return fieldValue.boolean_value ? 'Yes' : 'No';
      case 'date':
        return fieldValue.date_value ? new Date(fieldValue.date_value).toLocaleDateString() : '';
      case 'multi_select':
        return Array.isArray(fieldValue.json_value) ? fieldValue.json_value.join(', ') : '';
      default:
        return fieldValue.json_value ? JSON.stringify(fieldValue.json_value) : '';
    }
  }, []);

  // Get field options for select fields
  const getFieldOptions = useCallback((field: CustomField) => {
    if (field.field_type === 'select' || field.field_type === 'multi_select') {
      return field.field_config?.options || [];
    }
    return [];
  }, []);

  // Validate field value
  const validateFieldValue = useCallback((field: CustomField, value: any) => {
    if (field.is_required && !value) {
      return `${field.name} is required`;
    }

    switch (field.field_type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Invalid email format';
        }
        break;
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          return 'Invalid URL format';
        }
        break;
      case 'number':
      case 'currency':
      case 'percentage':
        if (value && isNaN(parseFloat(value))) {
          return 'Must be a valid number';
        }
        break;
    }

    // Check field-specific validation rules
    if (field.field_config?.validation) {
      const validation = field.field_config.validation;
      if (validation.min && parseFloat(value) < validation.min) {
        return `Minimum value is ${validation.min}`;
      }
      if (validation.max && parseFloat(value) > validation.max) {
        return `Maximum value is ${validation.max}`;
      }
      if (validation.minLength && value.length < validation.minLength) {
        return `Minimum length is ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `Maximum length is ${validation.maxLength} characters`;
      }
    }

    return null;
  }, []);

  // Auto-fetch custom fields when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchCustomFields();
    }
  }, [currentWorkspace?.id, fetchCustomFields]);

  return {
    customFields,
    loading,
    error,
    fetchCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    getEntityFieldValues,
    setFieldValue,
    getFormattedValue,
    getFieldOptions,
    validateFieldValue,
  };
}
