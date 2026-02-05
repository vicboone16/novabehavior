import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, Plus, Search, Building2, Calendar, DollarSign,
  MoreHorizontal, Edit, Trash2, Users
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useContractRates } from '@/hooks/useContractRates';
import { ContractRateFormDialog } from './ContractRateFormDialog';
import type { ContractRate, ContractStatus } from '@/types/contractRates';
import { CONTRACT_TYPE_LABELS, BILLING_FREQUENCY_LABELS } from '@/types/contractRates';

export function ContractRateManager() {
  const { contracts, loading, createContract, updateContract, deleteContract } = useContractRates();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractRate | null>(null);
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);

  const filteredContracts = contracts.filter(c =>
    c.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contract_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContracts = filteredContracts.filter(c => c.status === 'active');
  const otherContracts = filteredContracts.filter(c => c.status !== 'active');

  const handleEdit = (contract: ContractRate) => {
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteContractId) {
      await deleteContract(deleteContractId);
      setDeleteContractId(null);
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    const variants: Record<ContractStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      expired: 'outline',
      terminated: 'destructive',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Rates
            </CardTitle>
            <CardDescription>
              Manage district and school-specific contracted rates
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingContract(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Active Contracts */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              Active Contracts
              <Badge variant="secondary">{activeContracts.length}</Badge>
            </h4>
            
            {activeContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active contracts
              </p>
            ) : (
              <div className="space-y-2">
                {activeContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onEdit={() => handleEdit(contract)}
                    onDelete={() => setDeleteContractId(contract.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Other Contracts */}
          {otherContracts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Expired / Pending / Terminated
              </h4>
              <div className="space-y-2">
                {otherContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onEdit={() => handleEdit(contract)}
                    onDelete={() => setDeleteContractId(contract.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ContractRateFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        contract={editingContract}
        onSubmit={async (data) => {
          if (editingContract) {
            return updateContract(editingContract.id, data);
          }
          return createContract(data as any);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContractId} onOpenChange={() => setDeleteContractId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this contract and remove all student assignments.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ContractCard({ 
  contract, 
  onEdit, 
  onDelete 
}: { 
  contract: ContractRate; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const totalServices = contract.services.length;
  const avgRate = totalServices > 0 
    ? contract.services.reduce((sum, s) => sum + s.rate, 0) / totalServices 
    : 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{contract.organization_name}</span>
          {getStatusBadgeSimple(contract.status)}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {CONTRACT_TYPE_LABELS[contract.contract_type]}
            </Badge>
          </span>
          {contract.contract_number && (
            <span>#{contract.contract_number}</span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(contract.contract_start_date), 'MMM d, yyyy')}
            {contract.contract_end_date && ` - ${format(new Date(contract.contract_end_date), 'MMM d, yyyy')}`}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {totalServices} service{totalServices !== 1 ? 's' : ''} • Avg ${avgRate.toFixed(2)}/unit
          </span>
          <span>
            {BILLING_FREQUENCY_LABELS[contract.billing_frequency]} billing
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getStatusBadgeSimple(status: ContractStatus) {
  const variants: Record<ContractStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    pending: 'secondary',
    expired: 'outline',
    terminated: 'destructive',
  };
  return <Badge variant={variants[status]} className="text-xs">{status}</Badge>;
}
