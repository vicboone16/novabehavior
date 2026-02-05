 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { ArrowLeft, Search, Plus, Building2, CheckCircle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { usePayerDirectory } from '@/hooks/usePayerDirectory';
 import { PayerDirectoryEntry } from '@/types/payerConfig';
 import { AddCustomPayerDialog } from '@/components/billing/payer-directory/AddCustomPayerDialog';
 
 export default function PayerDirectoryPage() {
   const navigate = useNavigate();
   const [searchTerm, setSearchTerm] = useState('');
   const [showCustomDialog, setShowCustomDialog] = useState(false);
   
   const {
     directoryEntries,
     isLoading,
     isPayerConfigured,
     getConfiguredPayer,
     addPayerFromDirectory,
   } = usePayerDirectory(searchTerm);
 
   const handleAddPayer = async (entry: PayerDirectoryEntry) => {
     const result = await addPayerFromDirectory.mutateAsync(entry);
     if (result) {
       navigate(`/billing/payers/${result.id}`);
     }
   };
 
   const handleViewPayer = (directoryId: string) => {
     const configured = getConfiguredPayer(directoryId);
     if (configured) {
       navigate(`/billing/payers/${configured.id}`);
     }
   };
 
   const getPayerTypeBadge = (entry: PayerDirectoryEntry) => {
     if (entry.source.source_name === 'state_medicaid') {
       return <Badge variant="outline" className="border-primary/50 text-primary">Medicaid</Badge>;
     }
     if (entry.payer_name.toLowerCase().includes('medicare')) {
       return <Badge variant="outline" className="border-primary/50 text-primary">Medicare</Badge>;
     }
     if (entry.payer_name.toLowerCase().includes('tricare')) {
       return <Badge variant="outline" className="border-primary/50 text-primary">Tricare</Badge>;
     }
     return <Badge variant="secondary">Commercial</Badge>;
   };
 
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="bg-card border-b border-border sticky top-0 z-20">
         <div className="container py-3">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Button variant="ghost" size="icon" onClick={() => navigate('/billing')}>
                 <ArrowLeft className="w-5 h-5" />
               </Button>
               <div>
                 <h1 className="text-lg font-bold text-foreground">Payer Directory</h1>
                 <p className="text-xs text-muted-foreground">Search and add payers to your system</p>
               </div>
             </div>
             <Button onClick={() => setShowCustomDialog(true)} variant="outline" className="gap-2">
               <Plus className="w-4 h-4" />
               Add Custom Payer
             </Button>
           </div>
         </div>
       </header>
 
       {/* Main Content */}
       <main className="container py-6">
         <Card>
           <CardHeader>
             <div className="flex items-center justify-between">
               <CardTitle className="flex items-center gap-2">
                 <Building2 className="w-5 h-5" />
                 National Payer Database
               </CardTitle>
               <div className="text-sm text-muted-foreground">
                 {directoryEntries.length} payers found
               </div>
             </div>
           </CardHeader>
           <CardContent>
             {/* Search */}
             <div className="relative mb-4">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input
                 placeholder="Search payer name or payer ID..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10"
               />
             </div>
 
             {/* Table */}
             {isLoading ? (
               <div className="py-8 text-center text-muted-foreground">Loading payers...</div>
             ) : (
               <div className="border rounded-lg">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Payer Name</TableHead>
                       <TableHead>Payer ID</TableHead>
                       <TableHead>Type</TableHead>
                       <TableHead>Eligibility</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {directoryEntries.map((entry) => {
                       const isConfigured = isPayerConfigured(entry.id);
                       return (
                         <TableRow key={entry.id}>
                           <TableCell>
                             <div>
                               <div className="font-medium">{entry.payer_name}</div>
                               {entry.aliases?.length > 0 && (
                                 <div className="text-xs text-muted-foreground">
                                   Also: {entry.aliases.slice(0, 2).join(', ')}
                                 </div>
                               )}
                             </div>
                           </TableCell>
                           <TableCell>
                             <code className="text-sm bg-muted px-2 py-0.5 rounded">
                               {entry.payer_id}
                             </code>
                           </TableCell>
                           <TableCell>{getPayerTypeBadge(entry)}</TableCell>
                           <TableCell>
                             {entry.eligibility_supported ? (
                               <Badge variant="outline" className="text-green-600 border-green-300">
                                 <CheckCircle className="w-3 h-3 mr-1" />
                                 Supported
                               </Badge>
                             ) : (
                               <Badge variant="outline" className="text-muted-foreground">
                                 Manual
                               </Badge>
                             )}
                           </TableCell>
                           <TableCell className="text-right">
                             {isConfigured ? (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleViewPayer(entry.id)}
                               >
                                 <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                 Configured
                               </Button>
                             ) : (
                               <Button
                                 size="sm"
                                 onClick={() => handleAddPayer(entry)}
                                 disabled={addPayerFromDirectory.isPending}
                               >
                                 <Plus className="w-4 h-4 mr-1" />
                                 Add Payer
                               </Button>
                             )}
                           </TableCell>
                         </TableRow>
                       );
                     })}
                     {directoryEntries.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                           {searchTerm ? 'No payers match your search' : 'No payers available'}
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </div>
             )}
           </CardContent>
         </Card>
       </main>
 
       <AddCustomPayerDialog
         open={showCustomDialog}
         onOpenChange={setShowCustomDialog}
       />
     </div>
   );
 }