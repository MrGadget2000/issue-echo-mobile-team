import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerData } from '@/types/issue';
import { customerDataSchema } from '@/lib/validation';
import { sanitizeText, sanitizePhoneNumber, sanitizeOrderId } from '@/lib/security';
import { useToast } from '@/hooks/use-toast';

interface CustomerDataFormProps {
  onSubmit: (data: CustomerData) => void;
  onCancel: () => void;
}

export function CustomerDataForm({ onSubmit, onCancel }: CustomerDataFormProps) {
  const [formData, setFormData] = useState<CustomerData>({
    customerName: '',
    orderId: '',
    phoneNumber: '',
    serviceType: '',
    additionalDetails: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const result = customerDataSchema.safeParse(formData);
    
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
    
    // Only submit if at least one field is filled
    const hasData = Object.values(formData).some(value => value && value.trim() !== '');
    if (hasData) {
      setErrors({});
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    let sanitizedValue = value;
    
    // Apply field-specific sanitization
    switch (field) {
      case 'customerName':
      case 'additionalDetails':
        sanitizedValue = sanitizeText(value);
        break;
      case 'phoneNumber':
        sanitizedValue = sanitizePhoneNumber(value);
        break;
      case 'orderId':
        sanitizedValue = sanitizeOrderId(value);
        break;
      default:
        sanitizedValue = sanitizeText(value);
    }
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            value={formData.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            placeholder="John Doe"
            className={errors.customerName ? 'border-destructive' : ''}
          />
          {errors.customerName && (
            <p className="text-sm text-destructive">{errors.customerName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="orderId">Order ID</Label>
          <Input
            id="orderId"
            value={formData.orderId}
            onChange={(e) => handleInputChange('orderId', e.target.value)}
            placeholder="123456"
            className={errors.orderId ? 'border-destructive' : ''}
          />
          {errors.orderId && (
            <p className="text-sm text-destructive">{errors.orderId}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="021 123 4567"
            className={errors.phoneNumber ? 'border-destructive' : ''}
          />
          {errors.phoneNumber && (
            <p className="text-sm text-destructive">{errors.phoneNumber}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="serviceType">Service Type</Label>
          <Select value={formData.serviceType} onValueChange={(value) => handleInputChange('serviceType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new-activation">New Activation</SelectItem>
              <SelectItem value="upgrade">Upgrade</SelectItem>
              <SelectItem value="port-in">Port In</SelectItem>
              <SelectItem value="device-replacement">Device Replacement</SelectItem>
              <SelectItem value="plan-change">Plan Change</SelectItem>
              <SelectItem value="suspension">Suspension</SelectItem>
              <SelectItem value="cancellation">Cancellation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="additionalDetails">Additional Details</Label>
        <Textarea
          id="additionalDetails"
          value={formData.additionalDetails}
          onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
          placeholder="Any additional context about this customer's issue..."
          rows={3}
          className={errors.additionalDetails ? 'border-destructive' : ''}
        />
        {errors.additionalDetails && (
          <p className="text-sm text-destructive">{errors.additionalDetails}</p>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="button" 
          className="bg-gradient-primary"
          onClick={handleSubmit}
        >
          Add Example
        </Button>
      </div>
    </div>
  );
}