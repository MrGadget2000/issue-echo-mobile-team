import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomerDataForm } from './CustomerDataForm';
import { Plus, X } from 'lucide-react';
import { CustomerData } from '@/types/issue';
import { issueSchema } from '@/lib/validation';
import { sanitizeText } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';

interface NewIssueFormProps {
  onSubmit: (title: string, description: string, customerData?: CustomerData, impactData?: {
    workaroundAvailable?: string;
    customerImpact?: 'none' | 'low' | 'medium' | 'high';
    teamImpact?: 'none' | 'low' | 'medium' | 'high';
    effortEstimate?: string;
    churnRisk?: boolean;
  }) => void;
  onCancel: () => void;
}

export function NewIssueForm({ onSubmit, onCancel }: NewIssueFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | undefined>();
  const [workaroundAvailable, setWorkaroundAvailable] = useState('');
  const [customerImpact, setCustomerImpact] = useState<'none' | 'low' | 'medium' | 'high' | ''>('');
  const [teamImpact, setTeamImpact] = useState<'none' | 'low' | 'medium' | 'high' | ''>('');
  const [effortEstimate, setEffortEstimate] = useState('');
  const [churnRisk, setChurnRisk] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedDescription = sanitizeText(description.trim());
    
    // Validate the form data
    const result = issueSchema.safeParse({
      title: sanitizedTitle,
      description: sanitizedDescription,
      workaroundAvailable: sanitizeText(workaroundAvailable.trim()),
      customerImpact: customerImpact || undefined,
      teamImpact: teamImpact || undefined,
      effortEstimate: sanitizeText(effortEstimate.trim()),
      churnRisk
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
      const impactData = {
        workaroundAvailable: workaroundAvailable.trim() || undefined,
        customerImpact: (customerImpact as 'none' | 'low' | 'medium' | 'high') || undefined,
        teamImpact: (teamImpact as 'none' | 'low' | 'medium' | 'high') || undefined,
        effortEstimate: effortEstimate.trim() || undefined,
        churnRisk
      };
      onSubmit(sanitizedTitle, sanitizedDescription, customerData, impactData);
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

          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold">Impact Assessment</h3>
            
            <div className="space-y-2">
              <Label htmlFor="workaround">Available Workaround</Label>
              <Textarea
                id="workaround"
                value={workaroundAvailable}
                onChange={(e) => {
                  setWorkaroundAvailable(sanitizeText(e.target.value));
                  if (errors.workaroundAvailable) setErrors(prev => ({ ...prev, workaroundAvailable: '' }));
                }}
                placeholder="Describe any workarounds available to customers..."
                rows={2}
                className={errors.workaroundAvailable ? 'border-destructive' : ''}
              />
              {errors.workaroundAvailable && (
                <p className="text-sm text-destructive">{errors.workaroundAvailable}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Impact</Label>
                <Select value={customerImpact} onValueChange={(value) => setCustomerImpact(value as 'none' | 'low' | 'medium' | 'high' | '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team Impact</Label>
                <Select value={teamImpact} onValueChange={(value) => setTeamImpact(value as 'none' | 'low' | 'medium' | 'high' | '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select impact level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effort">Effort Estimate</Label>
              <Input
                id="effort"
                value={effortEstimate}
                onChange={(e) => {
                  setEffortEstimate(sanitizeText(e.target.value));
                  if (errors.effortEstimate) setErrors(prev => ({ ...prev, effortEstimate: '' }));
                }}
                placeholder="e.g., 2-3 days, 1 sprint, requires specialist knowledge..."
                className={errors.effortEstimate ? 'border-destructive' : ''}
              />
              {errors.effortEstimate && (
                <p className="text-sm text-destructive">{errors.effortEstimate}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="churnRisk"
                checked={churnRisk}
                onCheckedChange={(checked) => setChurnRisk(checked === true)}
              />
              <Label htmlFor="churnRisk">Risk of customer churn due to this issue</Label>
            </div>
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