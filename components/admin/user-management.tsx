'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { MoreHorizontal, Eye, Edit, UserCog, Ban, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  type AdminUser,
  type AdminUserDetails,
  getAdminUserDetails,
  updateUserPlan,
  toggleUserSuspension,
  resetUserIterations,
  generateImpersonationToken,
} from '@/lib/actions/admin';
import { useRouter } from 'next/navigation';

interface UserActionsProps {
  user: AdminUser;
}

export function UserActions({ user }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<AdminUserDetails | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(user.plan);
  const { toast } = useToast();
  const router = useRouter();

  const handleViewDetails = () => {
    startTransition(async () => {
      const details = await getAdminUserDetails(user.id);
      setUserDetails(details);
      setDetailsOpen(true);
    });
  };

  const handleEditUser = () => {
    setSelectedPlan(user.plan);
    setEditOpen(true);
  };

  const handleSavePlan = () => {
    startTransition(async () => {
      const result = await updateUserPlan(user.id, selectedPlan as 'FREE' | 'PRO' | 'MAX');
      if (result.success) {
        toast({ title: 'Plan updated', description: `User plan changed to ${selectedPlan}` });
        setEditOpen(false);
        router.refresh();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleResetIterations = () => {
    startTransition(async () => {
      const result = await resetUserIterations(user.id);
      if (result.success) {
        toast({ title: 'Iterations reset', description: 'User iteration count has been reset to 0' });
        setEditOpen(false);
        router.refresh();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleImpersonate = () => {
    startTransition(async () => {
      const result = await generateImpersonationToken(user.id);
      if (result.success && result.clerkId) {
        // Open Clerk's impersonation URL in a new tab
        // Note: This requires Clerk's impersonation feature to be enabled
        window.open(`https://dashboard.clerk.com/impersonate/${result.clerkId}`, '_blank');
        toast({ 
          title: 'Impersonation', 
          description: 'Opening Clerk dashboard for impersonation. Make sure impersonation is enabled in your Clerk settings.' 
        });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleToggleSuspend = () => {
    startTransition(async () => {
      const result = await toggleUserSuspension(user.id, !user.suspended);
      if (result.success) {
        toast({ 
          title: user.suspended ? 'User unsuspended' : 'User suspended',
          description: user.suspended 
            ? 'User can now access the platform' 
            : 'User has been suspended from the platform'
        });
        setSuspendOpen(false);
        router.refresh();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditUser}>
            <Edit className="w-4 h-4 mr-2" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImpersonate}>
            <UserCog className="w-4 h-4 mr-2" />
            Impersonate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setSuspendOpen(true)}
            className={user.suspended ? 'text-green-600' : 'text-destructive'}
          >
            <Ban className="w-4 h-4 mr-2" />
            {user.suspended ? 'Unsuspend' : 'Suspend'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">User Details</DialogTitle>
            <DialogDescription>Detailed information about {user.name}</DialogDescription>
          </DialogHeader>
          {userDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-mono">{userDetails.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-mono">{userDetails.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan</Label>
                  <Badge variant={userDetails.plan === 'MAX' ? 'default' : 'secondary'}>
                    {userDetails.plan}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={userDetails.suspended ? 'destructive' : 'outline'}>
                    {userDetails.suspended ? 'Suspended' : 'Active'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Iterations</Label>
                  <p className="font-mono">{userDetails.iterationCount} / {userDetails.iterationLimit}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Interviews</Label>
                  <p className="font-mono">{userDetails.interviewCount} / {userDetails.interviewLimit}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Member Since</Label>
                  <p className="font-mono">{new Date(userDetails.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Active</Label>
                  <p className="font-mono">{userDetails.lastActive}</p>
                </div>
                {userDetails.stripeCustomerId && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Stripe Customer</Label>
                    <p className="font-mono text-xs">{userDetails.stripeCustomerId}</p>
                  </div>
                )}
              </div>
              
              {userDetails.interviews.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Recent Interviews</Label>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {userDetails.interviews.map((interview) => (
                      <div 
                        key={interview.id} 
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <div>
                          <p className="font-mono">{interview.jobTitle}</p>
                          <p className="text-xs text-muted-foreground">{interview.company}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Edit User</DialogTitle>
            <DialogDescription>Update settings for {user.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">FREE - 3 interviews, 5 iterations/month</SelectItem>
                  <SelectItem value="PRO">PRO - 25 interviews, 50 iterations/month</SelectItem>
                  <SelectItem value="MAX">MAX - 100 interviews, 500 iterations/month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Iterations</Label>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span className="text-sm">
                  Current: {user.iterationCount} / {user.iterationLimit}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetIterations}
                  disabled={isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Count
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.suspended ? 'Unsuspend User?' : 'Suspend User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.suspended 
                ? `This will restore ${user.name}'s access to the platform.`
                : `This will prevent ${user.name} from accessing the platform. They will not be able to log in or use any features.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleSuspend}
              className={user.suspended ? '' : 'bg-destructive hover:bg-destructive/90'}
            >
              {isPending ? 'Processing...' : (user.suspended ? 'Unsuspend' : 'Suspend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
