import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerData } from '@/types/issue';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit if at least one field is filled
    const hasData = Object.values(formData).some(value => value && value.trim() !== '');
    if (hasData) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="orderId">Order ID</Label>
          <Input
            id="orderId"
            value={formData.orderId}
            onChange={(e) => handleInputChange('orderId', e.target.value)}
            placeholder="ORD-12345"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
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
        />
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