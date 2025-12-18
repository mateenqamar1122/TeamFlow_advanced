import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Settings2,
  Edit,
  Trash2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Mail,
  Link,
  FileText,
  DollarSign,
  Percent,
  List,
  MoreVertical
} from 'lucide-react';
import { useCustomFields, CustomField } from '@/hooks/useCustomFields';

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'textarea', label: 'Long Text', icon: FileText },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'currency', label: 'Currency', icon: DollarSign },
  { value: 'percentage', label: 'Percentage', icon: Percent },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'boolean', label: 'Yes/No', icon: ToggleLeft },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'select', label: 'Select', icon: List },
  { value: 'multi_select', label: 'Multi-Select', icon: List },
];

const ENTITY_TYPES = [
  { value: 'projects', label: 'Projects' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'portfolios', label: 'Portfolios' },
  { value: 'goals', label: 'Goals' },
];

export default function CustomFieldsManagement() {
  const {
    customFields,
    loading,
    createCustomField,
    updateCustomField,
    deleteCustomField
  } = useCustomFields();

  const [showCreateField, setShowCreateField] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [selectedFieldType, setSelectedFieldType] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectOptions, setSelectOptions] = useState<string[]>(['']);

  const handleCreateField = async (formData: FormData) => {
    const fieldData = {
      name: formData.get('name') as string,
      field_key: (formData.get('field_key') as string).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      description: formData.get('description') as string,
      field_type: selectedFieldType as CustomField['field_type'],
      is_required: formData.get('is_required') === 'on',
      applies_to: selectedEntities,
      display_order: parseInt(formData.get('display_order') as string) || 0,
      field_config: getFieldConfig(),
    };

    const result = await createCustomField(fieldData);
    if (result) {
      resetForm();
      setShowCreateField(false);
    }
  };

  const handleUpdateField = async (fieldId: string, formData: FormData) => {
    const updates = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      is_required: formData.get('is_required') === 'on',
      display_order: parseInt(formData.get('display_order') as string) || 0,
      field_config: getFieldConfig(),
    };

    const result = await updateCustomField(fieldId, updates);
    if (result) {
      setEditingField(null);
      resetForm();
    }
  };

  const getFieldConfig = () => {
    const config: any = {};

    if (selectedFieldType === 'select' || selectedFieldType === 'multi_select') {
      config.options = selectOptions.filter(option => option.trim() !== '');
    }

    return config;
  };

  const resetForm = () => {
    setSelectedFieldType('');
    setSelectedEntities([]);
    setSelectOptions(['']);
  };

  const getFieldIcon = (fieldType: string) => {
    const fieldTypeInfo = FIELD_TYPES.find(type => type.value === fieldType);
    return fieldTypeInfo?.icon || Type;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground">Create and manage custom fields for your entities</p>
        </div>
        <Button onClick={() => setShowCreateField(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Field
        </Button>
      </div>

      {/* Custom Fields List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : customFields.length > 0 ? (
          customFields.map((field) => (
            <CustomFieldCard
              key={field.id}
              field={field}
              onEdit={setEditingField}
              onDelete={deleteCustomField}
            />
          ))
        ) : (
          <Card className="p-8 text-center">
            <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No custom fields yet</h3>
            <p className="text-muted-foreground mb-4">
              Create custom fields to capture additional information for your projects, tasks, and other entities.
            </p>
            <Button onClick={() => setShowCreateField(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Field
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Field Dialog */}
      <Dialog open={showCreateField || !!editingField} onOpenChange={(open) => {
        if (!open) {
          setShowCreateField(false);
          setEditingField(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? 'Update the custom field configuration.'
                : 'Define a new custom field that can be used across your workspace entities.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            if (editingField) {
              handleUpdateField(editingField.id, formData);
            } else {
              handleCreateField(formData);
            }
          }} className="space-y-6">

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Field Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editingField?.name}
                  />
                </div>
                <div>
                  <Label htmlFor="field_key">Field Key</Label>
                  <Input
                    id="field_key"
                    name="field_key"
                    required
                    placeholder="e.g., project_budget"
                    defaultValue={editingField?.field_key}
                    disabled={!!editingField}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique identifier (lowercase, underscores only)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={2}
                  defaultValue={editingField?.description}
                />
              </div>
            </div>

            <Separator />

            {/* Field Type */}
            <div className="space-y-4">
              <h3 className="font-medium">Field Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {FIELD_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedFieldType === type.value || editingField?.field_type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedFieldType(type.value)}
                      disabled={!!editingField}
                      className={`p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                        isSelected 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${editingField ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Options (for select and multi_select fields) */}
            {(selectedFieldType === 'select' || selectedFieldType === 'multi_select' ||
              editingField?.field_type === 'select' || editingField?.field_type === 'multi_select') && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-medium">Options</h3>
                  {selectOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...selectOptions];
                          newOptions[index] = e.target.value;
                          setSelectOptions(newOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                      {selectOptions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectOptions(selectOptions.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectOptions([...selectOptions, ''])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </>
            )}

            <Separator />

            {/* Entity Types */}
            {!editingField && (
              <>
                <div className="space-y-4">
                  <h3 className="font-medium">Applies To</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {ENTITY_TYPES.map((entity) => (
                      <div key={entity.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={entity.value}
                          checked={selectedEntities.includes(entity.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEntities([...selectedEntities, entity.value]);
                            } else {
                              setSelectedEntities(selectedEntities.filter(e => e !== entity.value));
                            }
                          }}
                        />
                        <Label htmlFor={entity.value}>{entity.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium">Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_required"
                    name="is_required"
                    defaultChecked={editingField?.is_required}
                  />
                  <Label htmlFor="is_required">Required field</Label>
                </div>
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    name="display_order"
                    type="number"
                    defaultValue={editingField?.display_order || 0}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateField(false);
                setEditingField(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingField ? 'Update Field' : 'Create Field'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Custom Field Card Component
function CustomFieldCard({
  field,
  onEdit,
  onDelete
}: {
  field: CustomField;
  onEdit: (field: CustomField) => void;
  onDelete: (fieldId: string) => Promise<boolean>;
}) {
  const Icon = FIELD_TYPES.find(type => type.value === field.field_type)?.icon || Type;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="p-2 border rounded-lg">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg">{field.name}</CardTitle>
                <Badge variant="outline">{field.field_key}</Badge>
                {field.is_required && (
                  <Badge variant="destructive">Required</Badge>
                )}
              </div>
              {field.description && (
                <CardDescription className="mt-1">{field.description}</CardDescription>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary">
                  {FIELD_TYPES.find(type => type.value === field.field_type)?.label}
                </Badge>
                {field.applies_to.map((entity) => (
                  <Badge key={entity} variant="outline">
                    {ENTITY_TYPES.find(e => e.value === entity)?.label || entity}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(field)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(field.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Field Configuration Preview */}
      {(field.field_type === 'select' || field.field_type === 'multi_select') &&
       field.field_config?.options && (
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Options:</Label>
            <div className="flex flex-wrap gap-1">
              {field.field_config.options.map((option: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
