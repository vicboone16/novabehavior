import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Phone, Mail, User, Star, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ClientContact, VisibilityPermission } from '@/types/clientProfile';

interface ContactsTabProps {
  clientId: string;
  contacts: ClientContact[];
  onRefresh: () => void;
}

const RELATIONSHIPS = [
  'Mother', 'Father', 'Parent', 'Guardian', 'Grandparent', 
  'Aunt', 'Uncle', 'Sibling', 'Foster Parent', 'Case Worker',
  'Teacher', 'Principal', 'School Counselor', 'Therapist', 
  'Physician', 'Nurse', 'Other'
];

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'text', label: 'Text Message' },
  { value: 'app', label: 'App Message' },
];

export function ContactsTab({ clientId, contacts, onRefresh }: ContactsTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    relationship: '',
    phones: [{ type: 'mobile', number: '', is_primary: true }],
    emails: [{ email: '', is_primary: true }],
    preferred_contact_method: '' as string,
    preferred_language: 'English',
    notes: '',
    is_primary_guardian: false,
    is_secondary_guardian: false,
    is_emergency_contact: false,
    is_school_contact: false,
    is_provider_contact: false,
    can_pickup: false,
    can_make_decisions: false,
    visibility_permission: 'internal_only' as VisibilityPermission,
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      relationship: '',
      phones: [{ type: 'mobile', number: '', is_primary: true }],
      emails: [{ email: '', is_primary: true }],
      preferred_contact_method: '',
      preferred_language: 'English',
      notes: '',
      is_primary_guardian: false,
      is_secondary_guardian: false,
      is_emergency_contact: false,
      is_school_contact: false,
      is_provider_contact: false,
      can_pickup: false,
      can_make_decisions: false,
      visibility_permission: 'internal_only',
    });
    setEditingContact(null);
  };

  const openEdit = (contact: ClientContact) => {
    setEditingContact(contact);
    setFormData({
      full_name: contact.full_name,
      relationship: contact.relationship,
      phones: contact.phones?.length ? contact.phones : [{ type: 'mobile', number: '', is_primary: true }],
      emails: contact.emails?.length ? contact.emails : [{ email: '', is_primary: true }],
      preferred_contact_method: contact.preferred_contact_method || '',
      preferred_language: contact.preferred_language || 'English',
      notes: contact.notes || '',
      is_primary_guardian: contact.is_primary_guardian,
      is_secondary_guardian: contact.is_secondary_guardian,
      is_emergency_contact: contact.is_emergency_contact,
      is_school_contact: contact.is_school_contact,
      is_provider_contact: contact.is_provider_contact,
      can_pickup: contact.can_pickup,
      can_make_decisions: contact.can_make_decisions,
      visibility_permission: contact.visibility_permission,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.relationship) {
      toast.error('Name and relationship are required');
      return;
    }

    try {
      setSaving(true);
      
      const contactData = {
        client_id: clientId,
        full_name: formData.full_name,
        relationship: formData.relationship,
        phones: formData.phones.filter(p => p.number),
        emails: formData.emails.filter(e => e.email),
        preferred_contact_method: formData.preferred_contact_method || null,
        preferred_language: formData.preferred_language,
        notes: formData.notes || null,
        is_primary_guardian: formData.is_primary_guardian,
        is_secondary_guardian: formData.is_secondary_guardian,
        is_emergency_contact: formData.is_emergency_contact,
        is_school_contact: formData.is_school_contact,
        is_provider_contact: formData.is_provider_contact,
        can_pickup: formData.can_pickup,
        can_make_decisions: formData.can_make_decisions,
        visibility_permission: formData.visibility_permission,
      };

      if (editingContact) {
        const { error } = await supabase
          .from('client_contacts')
          .update(contactData)
          .eq('id', editingContact.id);
        if (error) throw error;
        toast.success('Contact updated');
      } else {
        const { error } = await supabase
          .from('client_contacts')
          .insert(contactData);
        if (error) throw error;
        toast.success('Contact added');
      }

      setShowDialog(false);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Contact deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const primaryGuardian = contacts.find(c => c.is_primary_guardian);
  const hasPrimaryWithPhone = primaryGuardian && primaryGuardian.phones?.length > 0;

  return (
    <div className="space-y-4">
      {!hasPrimaryWithPhone && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">A primary guardian with phone number is required to activate this client.</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Contacts ({contacts.length})</h3>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {contacts.map((contact) => (
          <Card key={contact.id} className={contact.is_primary_guardian ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {contact.full_name}
                      {contact.is_primary_guardian && (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      )}
                    </CardTitle>
                    <CardDescription>{contact.relationship}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(contact)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {contact.phones?.map((phone, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{phone.number}</span>
                  <Badge variant="outline" className="text-xs">{phone.type}</Badge>
                  {phone.is_primary && <Badge className="text-xs">Primary</Badge>}
                </div>
              ))}
              {contact.emails?.map((email, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{email.email}</span>
                </div>
              ))}
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.is_primary_guardian && <Badge variant="secondary">Primary Guardian</Badge>}
                {contact.is_secondary_guardian && <Badge variant="secondary">Secondary Guardian</Badge>}
                {contact.is_emergency_contact && <Badge variant="outline">Emergency</Badge>}
                {contact.is_school_contact && <Badge variant="outline">School</Badge>}
                {contact.is_provider_contact && <Badge variant="outline">Provider</Badge>}
                {contact.can_pickup && <Badge variant="outline">Can Pickup</Badge>}
                {contact.can_make_decisions && <Badge variant="outline">Decision Maker</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship <span className="text-destructive">*</span></Label>
                <Select value={formData.relationship} onValueChange={(v) => setFormData({ ...formData, relationship: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Numbers</Label>
              {formData.phones.map((phone, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={phone.type} onValueChange={(v) => {
                    const phones = [...formData.phones];
                    phones[i].type = v;
                    setFormData({ ...formData, phones });
                  }}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={phone.number}
                    onChange={(e) => {
                      const phones = [...formData.phones];
                      phones[i].number = e.target.value;
                      setFormData({ ...formData, phones });
                    }}
                    placeholder="Phone number"
                    className="flex-1"
                  />
                  {formData.phones.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const phones = formData.phones.filter((_, idx) => idx !== i);
                        setFormData({ ...formData, phones });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData({
                  ...formData,
                  phones: [...formData.phones, { type: 'mobile', number: '', is_primary: false }]
                })}
              >
                Add Phone
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Email Addresses</Label>
              {formData.emails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={email.email}
                    onChange={(e) => {
                      const emails = [...formData.emails];
                      emails[i].email = e.target.value;
                      setFormData({ ...formData, emails });
                    }}
                    placeholder="Email address"
                    type="email"
                    className="flex-1"
                  />
                  {formData.emails.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const emails = formData.emails.filter((_, idx) => idx !== i);
                        setFormData({ ...formData, emails });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData({
                  ...formData,
                  emails: [...formData.emails, { email: '', is_primary: false }]
                })}
              >
                Add Email
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Contact Method</Label>
                <Select value={formData.preferred_contact_method} onValueChange={(v) => setFormData({ ...formData, preferred_contact_method: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferred Language</Label>
                <Input
                  value={formData.preferred_language}
                  onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Contact Roles</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.is_primary_guardian}
                    onCheckedChange={(c) => setFormData({ ...formData, is_primary_guardian: !!c })}
                  />
                  <Label className="font-normal">Primary Guardian</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.is_secondary_guardian}
                    onCheckedChange={(c) => setFormData({ ...formData, is_secondary_guardian: !!c })}
                  />
                  <Label className="font-normal">Secondary Guardian</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.is_emergency_contact}
                    onCheckedChange={(c) => setFormData({ ...formData, is_emergency_contact: !!c })}
                  />
                  <Label className="font-normal">Emergency Contact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.is_school_contact}
                    onCheckedChange={(c) => setFormData({ ...formData, is_school_contact: !!c })}
                  />
                  <Label className="font-normal">School Contact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.is_provider_contact}
                    onCheckedChange={(c) => setFormData({ ...formData, is_provider_contact: !!c })}
                  />
                  <Label className="font-normal">Provider Contact</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.can_pickup}
                    onCheckedChange={(c) => setFormData({ ...formData, can_pickup: !!c })}
                  />
                  <Label className="font-normal">Can Pickup</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.can_make_decisions}
                    onCheckedChange={(c) => setFormData({ ...formData, can_make_decisions: !!c })}
                  />
                  <Label className="font-normal">Can Make Decisions</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select 
                value={formData.visibility_permission} 
                onValueChange={(v: VisibilityPermission) => setFormData({ ...formData, visibility_permission: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal_only">Internal Only</SelectItem>
                  <SelectItem value="clinical_team">Clinical Team</SelectItem>
                  <SelectItem value="school_team">School Team</SelectItem>
                  <SelectItem value="parent_shareable">Parent Shareable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
