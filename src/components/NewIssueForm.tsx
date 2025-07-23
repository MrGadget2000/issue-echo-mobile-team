import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerDataForm } from './CustomerDataForm';
import { Plus, X } from 'lucide-react';
import { CustomerData } from '@/types/issue';
import { issueSchema } from '@/lib/validation';
import { sanitizeText } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';

interface NewIssueFormProps {
  onSubmit: (title: string, description: string, customerData?: CustomerData) => void;
  onCancel: () => void;
}

export function NewIssueForm({ onSubmit, onCancel }: NewIssueFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedDescription = sanitizeText(description.trim());
    
    // Validate the form data
    const result = issueSchema.safeParse({
      title: sanitizedTitle,
      description: sanitizedDescription
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(error => {
        if (error.path.length > 0) {
          fieldErrors[error.path[0]] = error.message;
        }
      });
      setErrors(fieldErrors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }
    
    if (sanitizedTitle && sanitizedDescription) {
      setErrors({});
      onSubmit(sanitizedTitle, sanitizedDescription, customerData);
    }
  };

  const handleCustomerDataSubmit = (data: CustomerData) => {
    setCustomerData(data);
    setShowCustomerForm(false);
  };

  const removeCustomerData = () => {
    setCustomerData(undefined);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="text-xl">Report New Issue</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(sanitizeText(e.target.value));
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
              placeholder="Brief description of the issue..."
              required
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Issue Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(sanitizeText(e.target.value));
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
              placeholder="Detailed description of the issue, steps to reproduce, impact, etc..."
              rows={4}
              required
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Customer Example (Optional)</Label>
              {!customerData && !showCustomerForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomerForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Example
                </Button>
              )}
            </div>
            
            {customerData && (
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    {customerData.customerName && (
                      <p><strong>Customer:</strong> {customerData.customerName}</p>
                    )}
                    {customerData.orderId && (
                      <p><strong>Order ID:</strong> {customerData.orderId}</p>
                    )}
                    {customerData.phoneNumber && (
                      <p><strong>Phone:</strong> {customerData.phoneNumber}</p>
                    )}
                    {customerData.serviceType && (
                      <p><strong>Service:</strong> {customerData.serviceType}</p>
                    )}
                    {customerData.additionalDetails && (
                      <p><strong>Details:</strong> {customerData.additionalDetails}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeCustomerData}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {showCustomerForm && !customerData && (
              <div className="bg-muted/30 rounded-lg p-4 border">
                <CustomerDataForm
                  onSubmit={handleCustomerDataSubmit}
                  onCancel={() => setShowCustomerForm(false)}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary"
              disabled={!title.trim() || !description.trim()}
            >
              Create Issue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}