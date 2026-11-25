
"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getUsers, updateUser, deleteUser } from "@/lib/firestore"
import { MoreHorizontal, PlusCircle, ShieldAlert } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import type { User } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { auth } from "@/lib/firebase"

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { toast } = useToast();

 useEffect(() => {
    const fetchAdminData = async () => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            setIsLoading(true);
            try {
                const allUsers = await getUsers();
                const appUser = allUsers.find(u => u.email === firebaseUser.email);
                
                setCurrentUser(appUser || null);

                if (appUser && appUser.role === 'admin') {
                    setUsers(allUsers);
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        } else {
            // This case should be handled by the layout, but as a fallback:
            setCurrentUser(null);
            setUsers([]);
            setIsLoading(false);
        }
    };
    
    fetchAdminData();
  }, []);


  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white';
      case 'tecnico':
        return 'bg-blue-500 text-white';
      case 'usuario':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }
  
  const getStatusVariant = (activo: boolean | undefined) => {
     if (activo === undefined) return 'bg-gray-500';
     return activo ? 'bg-green-500 text-white' : 'bg-destructive text-destructive-foreground';
  }

  const handleUpdate = async (userId: string, data: Partial<User>) => {
    try {
      await updateUser(String(userId), data);
      setUsers(users.map(user => user.id === userId ? { ...user, ...data } : user));
      toast({ title: "Éxito", description: "El usuario ha sido actualizado." });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: "Error", description: "No se pudo actualizar el usuario.", variant: "destructive" });
    }
  }
  
  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setIsAlertOpen(true);
  }

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.id);
      setUsers(users.filter(user => user.id !== userToDelete.id));
      toast({ title: "Éxito", description: `El usuario ${userToDelete.name} ha sido eliminado.` });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive" });
    } finally {
      setIsAlertOpen(false);
      setUserToDelete(null);
    }
  }
  
   if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
        <Card className="text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive/10 rounded-full p-3 w-fit">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="mt-4">Acceso Denegado</CardTitle>
                <CardDescription>
                    Esta sección es solo para administradores. No tienes los permisos necesarios para ver esta página.
                </CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold">Administración de Usuarios</h1>
            <p className="text-muted-foreground">Gestione los usuarios del sistema y sus permisos.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Usuario
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Usuarios registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getRoleVariant(user.role)}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className={getStatusVariant(user.activo)}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                            disabled={user.id === currentUser?.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>Editar Perfil</DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Cambiar Rol</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleUpdate(user.id, { role: 'admin' })}>Admin</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdate(user.id, { role: 'tecnico' })}>Técnico</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdate(user.id, { role: 'usuario' })}>Usuario</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Cambiar Estado</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleUpdate(user.id, { activo: true })}>Activo</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdate(user.id, { activo: false })}>Inactivo</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuItem className="text-red-600" onClick={() => confirmDelete(user)}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción es permanente y no se puede deshacer. El usuario{" "}
                <span className="font-semibold">{userToDelete?.name}</span> será eliminado del sistema.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
