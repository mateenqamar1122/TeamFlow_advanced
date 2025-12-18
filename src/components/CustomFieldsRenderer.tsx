import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Save, Edit } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCustomFields, CustomField, CustomFieldValue } from '@/hooks/useCustomFields';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CustomFieldsRendererProps {
  entityType: 'project' | 'task' | 'portfolio' | 'goal';
  entityId: string;
  mode?: 'view' | 'edit';
  onSave?: (values: Record<string, any>) => void;
  showTitle?: boolean;
  className?: string;
}

export function CustomFieldsRenderer({
  entityType,
  entityId,
  mode = 'view',
  onSave,
  showTitle = true,
  className
}: CustomFieldsRendererProps) {
  const {
    customFields,
    loading,
    getEntityFieldValues,
    setFieldValue,
    getFormattedValue,
    getFieldOptions,
    validateFieldValue
  } = useCustomFields();

  const [fieldValues, setFieldValues] = useState<CustomFieldValue[]>([]);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load field values when component mounts or entity changes
  useEffect(() => {
    const loadFieldValues = async () => {
      if (entityId) {
        const values = await getEntityFieldValues(entityType, entityId);
        setFieldValues(values);

        // Initialize editing values
        const initialValues: Record<string, any> = {};
        values.forEach(value => {
          const field = customFields.find(f => f.id === value.custom_field_id);
          if (field) {
            initialValues[field.field_key] = getCurrentValue(field, value);
          }
        });
        setEditingValues(initialValues);
      }
    };

    if (customFields.length > 0) {
      loadFieldValues();
    }
  }, [entityId, entityType, customFields, getEntityFieldValues]);

  // Get current value for a field
  const getCurrentValue = (field: CustomField, fieldValue?: CustomFieldValue) => {
    if (!fieldValue) return getDefaultValue(field);

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'textarea':
      case 'select':
        return fieldValue.text_value || '';
      case 'number':
      case 'currency':
      case 'percentage':
        return fieldValue.number_value || 0;
      case 'boolean':
        return fieldValue.boolean_value || false;
      case 'date':
        return fieldValue.date_value ? new Date(fieldValue.date_value) : null;
      case 'multi_select':
        return Array.isArray(fieldValue.json_value) ? fieldValue.json_value : [];
      default:
        return fieldValue.json_value || null;
    }
  };

  // Get default value for a field
  const getDefaultValue = (field: CustomField) => {
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
      case 'textarea':
      case 'select':
        return '';
      case 'number':
      case 'currency':
      case 'percentage':
        return 0;
      case 'boolean':
        return false;
      case 'date':
        return null;
      case 'multi_select':
        return [];
      default:
        return null;
    }
  };

  // Handle value change
  const handleValueChange = (fieldKey: string, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [fieldKey]: value
    }));

    // Clear error when value changes
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // Save all field values
  const handleSave = async () => {
    setSaving(true);
    setErrors({});

    try {
      const newErrors: Record<string, string> = {};

      // Validate all fields
      for (const field of customFields.filter(f => f.applies_to.includes(entityType))) {
        const value = editingValues[field.field_key];
        const error = validateFieldValue(field, value);
        if (error) {
          newErrors[field.field_key] = error;
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Save each field value
      const savePromises = customFields
        .filter(field => field.applies_to.includes(entityType))
        .map(field => {
          const value = editingValues[field.field_key];
          if (value !== undefined && value !== null && value !== '') {
            return setFieldValue({
              custom_field_id: field.id,
              entity_type: entityType,
              entity_id: entityId,
              value: value
            });
          }
          return Promise.resolve();
        });

      await Promise.all(savePromises);

      // Reload field values
      const values = await getEntityFieldValues(entityType, entityId);
      setFieldValues(values);

      if (onSave) {
        onSave(editingValues);
      }

      if (mode === 'view') {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving custom fields:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get applicable fields for this entity type
  const applicableFields = customFields.filter(field => field.applies_to.includes(entityType));

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (applicableFields.length === 0) {
    return null; // No custom fields for this entity type
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Custom Fields</CardTitle>
            {mode === 'view' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {applicableFields.map((field) => {
          const fieldValue = fieldValues.find(v => v.custom_field_id === field.id);
          const currentValue = editingValues[field.field_key] ?? getCurrentValue(field, fieldValue);
          const error = errors[field.field_key];

          return (
            <div key={field.id} className="space-y-2">
              <Label className="flex items-center space-x-2">
                <span>{field.name}</span>
                {field.is_required && <span className="text-red-500">*</span>}
              </Label>

              {field.description && (
                <p className="text-sm text-muted-foreground">{field.description}</p>
              )}

              {isEditing ? (
                <CustomFieldInput
                  field={field}
                  value={currentValue}
                  onChange={(value) => handleValueChange(field.field_key, value)}
                  error={error}
                />
              ) : (
                <CustomFieldDisplay field={field} value={fieldValue} />
              )}

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          );
        })}

        {isEditing && (
          <div className="flex justify-end space-x-2 pt-4">
            {mode === 'view' && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Custom Field Input Component
function CustomFieldInput({
  field,
  value,
  onChange,
  error
}: {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}) {
  const { getFieldOptions } = useCustomFields();

  switch (field.field_type) {
    case 'text':
    case 'email':
    case 'url':
      return (
        <Input
          type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={error ? 'border-red-500' : ''}
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={error ? 'border-red-500' : ''}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value || 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={error ? 'border-red-500' : ''}
        />
      );

    case 'currency':
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="number"
            step="0.01"
            value={value || 0}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={cn("pl-8", error && "border-red-500")}
          />
        </div>
      );

    case 'percentage':
      return (
        <div className="relative">
          <Input
            type="number"
            min="0"
            max="100"
            value={value || 0}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={cn("pr-8", error && "border-red-500")}
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
        </div>
      );

    case 'boolean':
      return (
        <Switch
          checked={value || false}
          onCheckedChange={onChange}
        />
      );

    case 'date':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !value && "text-muted-foreground",
                error && "border-red-500"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={value}
              onSelect={onChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );

    case 'select':
      const options = getFieldOptions(field);
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'multi_select':
      const multiOptions = getFieldOptions(field);
      const selectedValues = Array.isArray(value) ? value : [];

      return (
        <div className="space-y-2">
          {multiOptions.map((option: string) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.field_key}-${option}`}
                checked={selectedValues.includes(option)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedValues, option]);
                  } else {
                    onChange(selectedValues.filter((v: string) => v !== option));
                  }
                }}
              />
              <Label htmlFor={`${field.field_key}-${option}`}>{option}</Label>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={error ? 'border-red-500' : ''}
        />
      );
  }
}

// Custom Field Display Component
function CustomFieldDisplay({
  field,
  value
}: {
  field: CustomField;
  value?: CustomFieldValue;
}) {
  const { getFormattedValue } = useCustomFields();

  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  const formattedValue = getFormattedValue(field, value);

  if (field.field_type === 'boolean') {
    return (
      <Badge variant={value.boolean_value ? 'default' : 'secondary'}>
        {formattedValue}
      </Badge>
    );
  }

  if (field.field_type === 'multi_select') {
    const values = Array.isArray(value.json_value) ? value.json_value : [];
    return (
      <div className="flex flex-wrap gap-1">
        {values.map((val: string, index: number) => (
          <Badge key={index} variant="outline">
            {val}
          </Badge>
        ))}
      </div>
    );
  }

  if (field.field_type === 'url' && value.text_value) {
    return (
      <a
        href={value.text_value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {formattedValue}
      </a>
    );
  }

  if (field.field_type === 'email' && value.text_value) {
    return (
      <a
        href={`mailto:${value.text_value}`}
        className="text-blue-600 hover:underline"
      >
        {formattedValue}
      </a>
    );
  }

  return <span>{formattedValue}</span>;
}
