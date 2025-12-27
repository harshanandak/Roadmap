'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Loader2, UserPlus, Users } from 'lucide-react'
import { InviteMemberDialog } from '@/components/team/invite-member-dialog'
import { PhaseAssignmentMatrix } from '@/components/team/phase-assignment-matrix'
import { TeamMembersList } from '@/components/teams/team-members-list'
import Link from 'next/link'

interface WorkspacePermissionsSettingsProps {
    workspace: {
        id: string
        name: string
        team_id: string
    }
    currentUserId?: string
}

export function WorkspacePermissionsSettings({ workspace, currentUserId }: WorkspacePermissionsSettingsProps) {
    interface TeamMember {
    id: string
    user_id: string
    role: string
    joined_at: string
    users: {
      id: string
      email: string
      name: string | null
      avatar_url: string | null
    } | null
  }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loadingMembers, setLoadingMembers] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member'>('member')
    const [phaseMatrixOpen, setPhaseMatrixOpen] = useState(false)

    const supabase = createClient()

    // Load team members
    useEffect(() => {
        const loadTeamMembers = async () => {
            try {
                // Try to join with public.users table
                const { data, error } = await supabase
                    .from('team_members')
                    .select('id, user_id, role, joined_at, users(email, name)')
                    .eq('team_id', workspace.team_id)
                    .order('joined_at', { ascending: true })

                if (error) {
                    console.warn('Users table join failed, using fallback:', error)
                    const { data: basicData, error: basicError } = await supabase
                        .from('team_members')
                        .select('id, user_id, role, joined_at')
                        .eq('team_id', workspace.team_id)
                        .order('joined_at', { ascending: true })

                    if (basicError) throw basicError

                    const membersWithPlaceholder = (basicData || []).map(member => ({
                        ...member,
                        users: {
                            id: member.user_id,
                            email: member.user_id,
                            name: null,
                            avatar_url: null
                        }
                    }))

                    setTeamMembers(membersWithPlaceholder)

                    if (currentUserId) {
                        const currentMember = basicData?.find(m => m.user_id === currentUserId)
                        if (currentMember) {
                            setCurrentUserRole(currentMember.role)
                        }
                    }
                    setLoadingMembers(false)
                    return
                }

                // Normalize users join - Supabase may return array or single object
                const normalizedData = (data || []).map(member => {
                    const usersData = member.users
                    const userInfo = Array.isArray(usersData) ? usersData[0] : usersData
                    return {
                        id: member.id,
                        user_id: member.user_id,
                        role: member.role,
                        joined_at: member.joined_at,
                        users: userInfo ? {
                            id: member.user_id,
                            email: userInfo.email || member.user_id,
                            name: userInfo.name || null,
                            avatar_url: null
                        } : null
                    }
                })
                setTeamMembers(normalizedData)

                if (currentUserId) {
                    const currentMember = data?.find(m => m.user_id === currentUserId)
                    if (currentMember) {
                        setCurrentUserRole(currentMember.role)
                    }
                }
            } catch (error) {
                console.error('Error loading team members:', error)
            } finally {
                setLoadingMembers(false)
            }
        }

        loadTeamMembers()
    }, [workspace.team_id, currentUserId, supabase])

    const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Team Members & Access
                            </CardTitle>
                            <CardDescription>
                                Manage who has access to this workspace and their roles
                            </CardDescription>
                        </div>
                        {canManage && (
                            <Link href="/team/members">
                                <Button variant="outline" size="sm">
                                    View All
                                </Button>
                            </Link>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingMembers ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <TeamMembersList
                                members={teamMembers.map(member => ({
                                    ...member,
                                    users: member.users || null
                                }))}
                                currentUserId={currentUserId || ''}
                                currentUserRole={currentUserRole}
                                teamId={workspace.team_id}
                                workspaceId={workspace.id}
                                workspaceName={workspace.name}
                            />

                            <div className="flex gap-2 pt-4">
                                {canManage && (
                                    <>
                                        <InviteMemberDialog
                                            teamId={workspace.team_id}
                                            preSelectedWorkspaceId={workspace.id}
                                            trigger={
                                                <Button variant="outline" className="flex-1">
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Invite Member
                                                </Button>
                                            }
                                        />
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setPhaseMatrixOpen(true)}
                                        >
                                            Phase Access Matrix
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <PhaseAssignmentMatrix
                workspaceId={workspace.id}
                workspaceName={workspace.name}
                teamId={workspace.team_id}
                open={phaseMatrixOpen}
                onOpenChange={setPhaseMatrixOpen}
            />
        </div>
    )
}
