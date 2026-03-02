# TaskFlow - Documentation API

> Cette application utilise les **Next.js Server Actions** comme couche API. Les actions sont des fonctions asynchrones exécutées côté serveur, appelées directement depuis les composants React.

## Format de réponse standard

Toutes les actions de mutation retournent un objet au format suivant :

```typescript
{
  success: boolean;
  data?: any;       // Données retournées en cas de succès
  error?: string;   // Message d'erreur en cas d'échec
}
```

---

## 1. Authentification

**Fichier :** `app/actions/authActions.ts`

### `loginUser(email, password?)`

Connexion d'un utilisateur par email/mot de passe.

| Paramètre  | Type     | Requis | Description            |
|-------------|----------|--------|------------------------|
| `email`     | `string` | Oui    | Adresse email          |
| `password`  | `string` | Non    | Mot de passe (optionnel pour comptes Google) |

**Réponse succès :**
```json
{
  "success": true,
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://ui-avatars.com/api/?name=John+Doe&background=random"
  }
}
```

**Erreurs possibles :** `"User not found"`, `"Password required"`, `"Invalid password"`

**Notes :** Gère la migration automatique des mots de passe en clair vers bcrypt.

---

### `registerUser(name, email, password)`

Inscription d'un nouvel utilisateur.

| Paramètre  | Type     | Requis | Description       |
|-------------|----------|--------|-------------------|
| `name`      | `string` | Oui    | Nom de l'utilisateur |
| `email`     | `string` | Oui    | Adresse email     |
| `password`  | `string` | Oui    | Mot de passe      |

**Réponse succès :** Identique à `loginUser`.

**Erreurs possibles :** `"Email already registered"`

---

### `loginWithGoogle(googleToken)`

Connexion/inscription via Google OAuth2.

| Paramètre     | Type     | Requis | Description                 |
|----------------|----------|--------|-----------------------------|
| `googleToken`  | `string` | Oui    | Token ID Google à vérifier  |

**Comportement :**
- Si l'utilisateur existe avec ce `googleId` : connexion directe
- Si un compte existe avec le même email : liaison du compte Google
- Sinon : création d'un nouveau compte

**Réponse succès :** Identique à `loginUser` (avec `googleImage` comme avatar si disponible).

---

## 2. Workspaces

**Fichier :** `app/actions/workspaceActions.ts`

### `getWorkspaces(userId)`

Récupère tous les workspaces où l'utilisateur est propriétaire ou membre.

| Paramètre | Type     | Requis | Description     |
|-----------|----------|--------|-----------------|
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Réponse :** `Workspace[]` avec les relations `owner`, `members`, `_count { boards, members }`.

---

### `getWorkspaceDetails(workspaceId, userId)`

Récupère les détails complets d'un workspace.

| Paramètre     | Type     | Requis | Description          |
|---------------|----------|--------|----------------------|
| `workspaceId` | `string` | Oui    | ID du workspace      |
| `userId`      | `string` | Oui    | ID de l'utilisateur  |

**Réponse :** Workspace avec `owner`, `members`, `boards`, `invitations` (pending uniquement). Retourne `null` si pas d'accès.

---

### `createWorkspace(name, userId, description?, color?)`

Crée un nouveau workspace.

| Paramètre     | Type     | Requis | Description          |
|---------------|----------|--------|----------------------|
| `name`        | `string` | Oui    | Nom du workspace     |
| `userId`      | `string` | Oui    | ID du créateur       |
| `description` | `string` | Non    | Description          |
| `color`       | `string` | Non    | Couleur (défaut: `#3b82f6`) |

**Réponse succès :**
```json
{
  "success": true,
  "workspace": { "id": "...", "name": "...", "owner": {...}, "members": [...] }
}
```

**Note :** Le créateur est automatiquement ajouté comme membre ADMIN.

---

### `updateWorkspace(workspaceId, userId, data)`

Met à jour un workspace.

| Paramètre     | Type     | Requis | Description            |
|---------------|----------|--------|------------------------|
| `workspaceId` | `string` | Oui    | ID du workspace        |
| `userId`      | `string` | Oui    | ID de l'utilisateur    |
| `data`        | `object` | Oui    | `{ name?, description?, color? }` |

**Permissions :** Owner ou ADMIN uniquement.

---

### `deleteWorkspace(workspaceId, userId)`

Supprime un workspace et toutes ses données (cascade).

| Paramètre     | Type     | Requis | Description         |
|---------------|----------|--------|---------------------|
| `workspaceId` | `string` | Oui    | ID du workspace     |
| `userId`      | `string` | Oui    | ID de l'utilisateur |

**Permissions :** Owner uniquement.

---

## 3. Membres

**Fichier :** `app/actions/workspaceActions.ts`

### `getUserRole(workspaceId, userId)`

Retourne le rôle d'un utilisateur dans un workspace.

| Paramètre     | Type     | Requis | Description         |
|---------------|----------|--------|---------------------|
| `workspaceId` | `string` | Oui    | ID du workspace     |
| `userId`      | `string` | Oui    | ID de l'utilisateur |

**Réponse :** `"ADMIN" | "MEMBER" | "VIEWER" | null`

---

### `updateMemberRole(workspaceId, targetUserId, newRole, currentUserId)`

Change le rôle d'un membre.

| Paramètre       | Type         | Requis | Description              |
|------------------|-------------|--------|--------------------------|
| `workspaceId`    | `string`    | Oui    | ID du workspace          |
| `targetUserId`   | `string`    | Oui    | ID du membre à modifier  |
| `newRole`        | `MemberRole`| Oui    | `ADMIN`, `MEMBER`, `VIEWER` |
| `currentUserId`  | `string`    | Oui    | ID de l'utilisateur courant |

**Permissions :** Owner ou ADMIN. Seul l'Owner peut promouvoir en ADMIN.

**Event Socket :** `workspace:member-role-changed` -> room `workspace:{id}`

---

### `removeMember(workspaceId, targetUserId, currentUserId)`

Retire un membre du workspace (ou le membre se retire lui-même).

| Paramètre       | Type     | Requis | Description                |
|------------------|----------|--------|----------------------------|
| `workspaceId`    | `string` | Oui    | ID du workspace            |
| `targetUserId`   | `string` | Oui    | ID du membre à retirer     |
| `currentUserId`  | `string` | Oui    | ID de l'utilisateur courant|

**Permissions :** Owner, ADMIN, ou soi-même. L'Owner ne peut pas être retiré.

**Event Socket :** `workspace:member-removed` -> room `workspace:{id}`

---

## 4. Invitations

**Fichier :** `app/actions/workspaceActions.ts`

### `createInvitation(workspaceId, inviteeEmail, role, inviterId)`

Envoie une invitation à rejoindre un workspace.

| Paramètre       | Type         | Requis | Description                 |
|------------------|-------------|--------|-----------------------------|
| `workspaceId`    | `string`    | Oui    | ID du workspace             |
| `inviteeEmail`   | `string`    | Oui    | Email de la personne invitée|
| `role`           | `MemberRole`| Oui    | Rôle attribué               |
| `inviterId`      | `string`    | Oui    | ID de l'inviteur            |

**Permissions :** Owner ou ADMIN. Seul l'Owner peut inviter en tant qu'ADMIN.

**Comportement :**
- Expiration automatique après 7 jours
- Crée une notification `WORKSPACE_INVITATION` si l'invité a un compte
- Vérifie les doublons (membre existant, invitation en attente)

**Event Socket :** `notification:new` -> room `user:{inviteeId}`

---

### `getPendingInvitations(userId)`

Récupère les invitations en attente pour un utilisateur.

| Paramètre | Type     | Requis | Description     |
|-----------|----------|--------|-----------------|
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Réponse :** `WorkspaceInvitation[]` avec `workspace` et `inviter`.

---

### `respondToInvitation(invitationId, userId, accept)`

Accepte ou refuse une invitation.

| Paramètre      | Type      | Requis | Description           |
|-----------------|-----------|--------|-----------------------|
| `invitationId`  | `string`  | Oui    | ID de l'invitation    |
| `userId`        | `string`  | Oui    | ID de l'utilisateur   |
| `accept`        | `boolean` | Oui    | `true` = accepter     |

**Comportement :** Vérifie l'expiration (7 jours). En cas d'acceptation, ajoute le membre au workspace dans une transaction.

**Event Socket :** `workspace:member-added` -> room `workspace:{id}` (si accepté)

---

### `cancelInvitation(invitationId, userId)`

Annule une invitation en attente.

| Paramètre      | Type     | Requis | Description           |
|-----------------|----------|--------|-----------------------|
| `invitationId`  | `string` | Oui    | ID de l'invitation    |
| `userId`        | `string` | Oui    | ID de l'utilisateur   |

**Permissions :** Owner, ADMIN, ou l'inviteur.

---

## 5. Boards

**Fichiers :** `app/actions/workspaceActions.ts`, `app/actions/boardActions.ts`

### `getWorkspaceBoards(workspaceId, userId)`

Récupère tous les boards d'un workspace.

| Paramètre     | Type     | Requis | Description         |
|---------------|----------|--------|---------------------|
| `workspaceId` | `string` | Oui    | ID du workspace     |
| `userId`      | `string` | Oui    | ID de l'utilisateur |

**Réponse :** `Board[]` (`id`, `title`, `color`, `createdAt`).

---

### `createBoardInWorkspace(workspaceId, title, userId, color?)`

Crée un nouveau board dans un workspace.

| Paramètre     | Type     | Requis | Description                    |
|---------------|----------|--------|--------------------------------|
| `workspaceId` | `string` | Oui    | ID du workspace                |
| `title`       | `string` | Oui    | Titre du board                 |
| `userId`      | `string` | Oui    | ID de l'utilisateur            |
| `color`       | `string` | Non    | Couleur (défaut: `#3b82f6`)    |

**Permissions :** ADMIN ou MEMBER (pas VIEWER).

**Event Socket :** `board:created` -> room `workspace:{id}`

---

### `deleteBoardFromWorkspace(boardId, userId)`

Supprime un board.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `boardId` | `string` | Oui    | ID du board         |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Permissions :** Owner ou ADMIN uniquement.

**Event Socket :** `board:deleted` -> room `workspace:{id}`

---

### `getBoardDetails(boardId)`

Récupère les détails complets d'un board avec ses listes, tâches, labels et membres.

| Paramètre | Type     | Requis | Description |
|-----------|----------|--------|-------------|
| `boardId` | `string` | Oui    | ID du board |

**Réponse :** Board avec `labels`, `workspace.members`, `lists[].tasks[]` (incluant assignees, labels, checklists, comment count).

---

### `updateBoardSettings(boardId, data, userId)`

Met à jour les paramètres d'un board.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `boardId` | `string` | Oui    | ID du board         |
| `data`    | `object` | Oui    | `{ title?, color?, backgroundImage? }` |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Permissions :** ADMIN uniquement.

**Event Socket :** `board:settings-changed` -> room `board:{id}`

---

## 6. Listes (TaskList)

**Fichier :** `app/actions/boardActions.ts`

### `createList(boardId, title, userId)`

Crée une nouvelle liste dans un board.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `boardId` | `string` | Oui    | ID du board         |
| `title`   | `string` | Oui    | Titre de la liste   |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Permissions :** ADMIN ou MEMBER.

**Comportement :** L'ordre est automatiquement calculé (ajout en fin de board).

**Event Socket :** `list:created` -> room `board:{id}`

---

### `reorderLists(boardId, listIds, userId)`

Réordonne les listes d'un board.

| Paramètre | Type       | Requis | Description                    |
|-----------|------------|--------|--------------------------------|
| `boardId` | `string`   | Oui    | ID du board                    |
| `listIds` | `string[]` | Oui    | IDs dans le nouvel ordre       |
| `userId`  | `string`   | Oui    | ID de l'utilisateur            |

**Permissions :** ADMIN ou MEMBER.

**Event Socket :** `list:reordered` -> room `board:{id}`

---

## 7. Tâches (Task)

**Fichier :** `app/actions/boardActions.ts`

### `createTask(listId, title, userId)`

Crée une nouvelle tâche dans une liste.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `listId`  | `string` | Oui    | ID de la liste      |
| `title`   | `string` | Oui    | Titre de la tâche   |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Permissions :** ADMIN ou MEMBER.

**Réponse :** Task complète avec `assignees`, `labels`, `checklists`, `_count.comments`.

**Event Socket :** `task:created` -> room `board:{id}`

---

### `updateTask(taskId, data, userId)`

Met à jour le titre ou la description d'une tâche.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `taskId`  | `string` | Oui    | ID de la tâche      |
| `data`    | `object` | Oui    | `{ title?, description? }` |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `task:updated` -> room `board:{id}`

---

### `deleteTask(taskId, userId)`

Supprime une tâche.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `taskId`  | `string` | Oui    | ID de la tâche      |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `task:deleted` -> room `board:{id}`

---

### `reorderTasksInList(listId, taskIds, userId)`

Réordonne les tâches dans une liste.

| Paramètre | Type       | Requis | Description                    |
|-----------|------------|--------|--------------------------------|
| `listId`  | `string`   | Oui    | ID de la liste                 |
| `taskIds` | `string[]` | Oui    | IDs dans le nouvel ordre       |
| `userId`  | `string`   | Oui    | ID de l'utilisateur            |

**Event Socket :** `task:reordered` -> room `board:{id}`

---

### `moveTaskToList(taskId, targetListId, newOrder, userId)`

Déplace une tâche vers une autre liste.

| Paramètre      | Type     | Requis | Description              |
|------------------|----------|--------|--------------------------|
| `taskId`         | `string` | Oui    | ID de la tâche           |
| `targetListId`   | `string` | Oui    | ID de la liste cible     |
| `newOrder`       | `number` | Oui    | Position dans la liste   |
| `userId`         | `string` | Oui    | ID de l'utilisateur      |

**Event Socket :** `task:moved` -> room `board:{id}` (inclut `sourceListId` et `targetListId`)

---

## 8. Détails de tâche

**Fichier :** `app/actions/cardActions.ts`

### `getTaskDetails(taskId)`

Récupère les détails complets d'une tâche.

| Paramètre | Type     | Requis | Description    |
|-----------|----------|--------|----------------|
| `taskId`  | `string` | Oui    | ID de la tâche |

**Réponse :** Task avec `assignees`, `labels`, `checklists[].items`, `comments`, `list.board.labels`, `list.board.workspace.members`.

---

### `updateTaskDetails(taskId, data, userId)`

Met à jour les détails d'une tâche (dates, description...).

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `taskId`  | `string` | Oui    | ID de la tâche      |
| `data`    | `object` | Oui    | `{ title?, description?, startDate?, dueDate? }` |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Note :** `startDate` et `dueDate` acceptent `Date | null`.

**Event Socket :** `task:updated` -> room `board:{id}`

---

## 9. Assignations

**Fichier :** `app/actions/cardActions.ts`

### `addAssignee(taskId, assigneeUserId, currentUserId)`

Assigne un utilisateur à une tâche.

| Paramètre        | Type     | Requis | Description                 |
|-------------------|----------|--------|-----------------------------|
| `taskId`          | `string` | Oui    | ID de la tâche              |
| `assigneeUserId`  | `string` | Oui    | ID de l'utilisateur à assigner |
| `currentUserId`   | `string` | Oui    | ID de l'utilisateur courant |

**Comportement :** Crée une notification `TASK_ASSIGNED` si ce n'est pas une auto-assignation.

**Events Socket :**
- `task:assignee-added` -> room `board:{id}`
- `notification:new` -> room `user:{assigneeUserId}` (si pas auto-assignation)

---

### `removeAssignee(taskId, assigneeUserId, currentUserId)`

Retire l'assignation d'un utilisateur.

| Paramètre        | Type     | Requis | Description                 |
|-------------------|----------|--------|-----------------------------|
| `taskId`          | `string` | Oui    | ID de la tâche              |
| `assigneeUserId`  | `string` | Oui    | ID de l'utilisateur         |
| `currentUserId`   | `string` | Oui    | ID de l'utilisateur courant |

**Event Socket :** `task:assignee-removed` -> room `board:{id}`

---

## 10. Labels

**Fichier :** `app/actions/cardActions.ts`

### `getBoardLabels(boardId)`

Récupère tous les labels d'un board.

| Paramètre | Type     | Requis | Description |
|-----------|----------|--------|-------------|
| `boardId` | `string` | Oui    | ID du board |

**Réponse :** `BoardLabel[]`

---

### `createBoardLabel(boardId, name, color, userId)`

Crée un nouveau label sur un board.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `boardId` | `string` | Oui    | ID du board         |
| `name`    | `string` | Oui    | Nom du label        |
| `color`   | `string` | Oui    | Couleur (hex)       |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `board:label-created` -> room `board:{id}`

---

### `updateBoardLabel(labelId, data, userId)`

Met à jour un label.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `labelId` | `string` | Oui    | ID du label         |
| `data`    | `object` | Oui    | `{ name?, color? }` |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `board:label-updated` -> room `board:{id}`

---

### `deleteBoardLabel(labelId, userId)`

Supprime un label.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `labelId` | `string` | Oui    | ID du label         |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `board:label-deleted` -> room `board:{id}`

---

### `addLabelToTask(taskId, labelId, userId)`

Ajoute un label à une tâche.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `taskId`  | `string` | Oui    | ID de la tâche      |
| `labelId` | `string` | Oui    | ID du label         |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `task:label-added` -> room `board:{id}`

---

### `removeLabelFromTask(taskId, labelId, userId)`

Retire un label d'une tâche.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `taskId`  | `string` | Oui    | ID de la tâche      |
| `labelId` | `string` | Oui    | ID du label         |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `task:label-removed` -> room `board:{id}`

---

## 11. Checklists

**Fichier :** `app/actions/cardActions.ts`

### `createChecklist(taskId, title, userId)`

Crée une checklist sur une tâche.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `taskId`  | `string` | Oui    | ID de la tâche      |
| `title`   | `string` | Oui    | Titre de la checklist |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `task:checklist-created` -> room `board:{id}`

---

### `deleteChecklist(checklistId, userId)`

Supprime une checklist et tous ses items.

| Paramètre     | Type     | Requis | Description            |
|---------------|----------|--------|------------------------|
| `checklistId` | `string` | Oui    | ID de la checklist     |
| `userId`      | `string` | Oui    | ID de l'utilisateur    |

**Event Socket :** `task:checklist-deleted` -> room `board:{id}`

---

### `addChecklistItem(checklistId, title, userId)`

Ajoute un item à une checklist.

| Paramètre     | Type     | Requis | Description            |
|---------------|----------|--------|------------------------|
| `checklistId` | `string` | Oui    | ID de la checklist     |
| `title`       | `string` | Oui    | Titre de l'item        |
| `userId`      | `string` | Oui    | ID de l'utilisateur    |

**Event Socket :** `task:checklist-item-added` -> room `board:{id}`

---

### `updateChecklistItem(itemId, data, userId)`

Met à jour un item (titre ou état coché/décoché).

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `itemId`  | `string` | Oui    | ID de l'item        |
| `data`    | `object` | Oui    | `{ title?, isChecked? }` |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `task:checklist-item-updated` -> room `board:{id}`

---

### `deleteChecklistItem(itemId, userId)`

Supprime un item de checklist.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `itemId`  | `string` | Oui    | ID de l'item        |
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Event Socket :** `task:checklist-item-deleted` -> room `board:{id}`

---

## 12. Commentaires

**Fichier :** `app/actions/cardActions.ts`

### `addComment(taskId, userId, text)`

Ajoute un commentaire à une tâche.

| Paramètre | Type     | Requis | Description         |
|-----------|----------|--------|---------------------|
| `taskId`  | `string` | Oui    | ID de la tâche      |
| `userId`  | `string` | Oui    | ID de l'utilisateur |
| `text`    | `string` | Oui    | Contenu du commentaire |

**Réponse :** Le commentaire avec les informations de l'utilisateur (`id`, `name`, `email`).

**Event Socket :** `task:comment-added` -> room `board:{id}`

---

### `deleteComment(commentId, userId)`

Supprime un commentaire (uniquement ses propres commentaires).

| Paramètre   | Type     | Requis | Description          |
|-------------|----------|--------|----------------------|
| `commentId` | `string` | Oui    | ID du commentaire    |
| `userId`    | `string` | Oui    | ID de l'utilisateur  |

**Permissions :** L'auteur du commentaire uniquement.

**Event Socket :** `task:comment-deleted` -> room `board:{id}`

---

## 13. Notifications

**Fichier :** `app/actions/notificationActions.ts`

### `createNotification(data)`

Crée une notification et l'envoie en temps réel.

| Paramètre                 | Type                    | Requis | Description              |
|---------------------------|-------------------------|--------|--------------------------|
| `data.type`               | `NotificationType`      | Oui    | Type de notification     |
| `data.message`            | `string`                | Oui    | Message                  |
| `data.userId`             | `string`                | Oui    | Destinataire             |
| `data.taskId`             | `string`                | Non    | Tâche liée               |
| `data.actorId`            | `string`                | Non    | Utilisateur déclencheur  |
| `data.workspaceInvitationId` | `string`             | Non    | Invitation liée          |

**Types :** `TASK_ASSIGNED`, `DUE_DATE_APPROACHING`, `WORKSPACE_INVITATION`

**Event Socket :** `notification:new` -> room `user:{userId}`

---

### `getNotifications(userId)`

Récupère les notifications d'un utilisateur (max 100).

| Paramètre | Type     | Requis | Description     |
|-----------|----------|--------|-----------------|
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Réponse :** `Notification[]` avec `task`, `actor`, `workspaceInvitation`.

---

### `getUnreadNotificationCount(userId)`

Retourne le nombre de notifications non lues.

| Paramètre | Type     | Requis | Description     |
|-----------|----------|--------|-----------------|
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Réponse :** `number`

---

### `markNotificationAsRead(notificationId, userId)`

Marque une notification comme lue.

| Paramètre        | Type     | Requis | Description            |
|-------------------|----------|--------|------------------------|
| `notificationId`  | `string` | Oui    | ID de la notification  |
| `userId`          | `string` | Oui    | ID de l'utilisateur    |

---

### `markAllNotificationsAsRead(userId)`

Marque toutes les notifications comme lues.

| Paramètre | Type     | Requis | Description     |
|-----------|----------|--------|-----------------|
| `userId`  | `string` | Oui    | ID de l'utilisateur |

---

### `checkDueDateNotifications(userId)`

Vérifie les tâches dont la date d'échéance est dans les prochaines 24h et crée les notifications correspondantes.

| Paramètre | Type     | Requis | Description     |
|-----------|----------|--------|-----------------|
| `userId`  | `string` | Oui    | ID de l'utilisateur |

**Comportement :** Ne crée pas de doublon si une notification `DUE_DATE_APPROACHING` existe déjà pour cette tâche.

**Réponse :** `{ success: boolean, created: number }`

---

## Annexe : Système de permissions

| Action                        | VIEWER | MEMBER | ADMIN | OWNER |
|-------------------------------|--------|--------|-------|-------|
| Voir workspace/board          | Oui    | Oui    | Oui   | Oui   |
| Créer board                   | Non    | Oui    | Oui   | Oui   |
| Supprimer board               | Non    | Non    | Oui   | Oui   |
| Modifier paramètres board     | Non    | Non    | Oui   | Oui   |
| Créer/modifier/supprimer tâche| Non    | Oui    | Oui   | Oui   |
| Gérer checklists/labels       | Non    | Oui    | Oui   | Oui   |
| Inviter des membres           | Non    | Non    | Oui   | Oui   |
| Inviter en tant qu'ADMIN      | Non    | Non    | Non   | Oui   |
| Modifier rôles                | Non    | Non    | Oui   | Oui   |
| Promouvoir en ADMIN           | Non    | Non    | Non   | Oui   |
| Supprimer workspace           | Non    | Non    | Non   | Oui   |
| Modifier workspace            | Non    | Non    | Oui   | Oui   |

---

## Annexe : Événements Socket.IO

### Événements client -> serveur

| Événement         | Payload       | Description                        |
|-------------------|---------------|------------------------------------|
| `authenticate`    | `userId`      | Authentification du socket         |
| `join-user`       | `userId`      | Rejoindre la room personnelle      |
| `join-workspace`  | `workspaceId` | Rejoindre la room workspace        |
| `leave-workspace` | `workspaceId` | Quitter la room workspace          |
| `join-board`      | `boardId`     | Rejoindre la room board            |
| `leave-board`     | `boardId`     | Quitter la room board              |

### Événements serveur -> client

| Événement                     | Room              | Description                           |
|-------------------------------|-------------------|---------------------------------------|
| `workspace:member-added`      | `workspace:{id}`  | Nouveau membre ajouté                 |
| `workspace:member-removed`    | `workspace:{id}`  | Membre retiré                         |
| `workspace:member-role-changed`| `workspace:{id}` | Rôle d'un membre modifié              |
| `board:created`               | `workspace:{id}`  | Nouveau board créé                    |
| `board:deleted`               | `workspace:{id}`  | Board supprimé                        |
| `board:settings-changed`      | `board:{id}`      | Paramètres du board modifiés          |
| `board:label-created`         | `board:{id}`      | Nouveau label créé                    |
| `board:label-updated`         | `board:{id}`      | Label modifié                         |
| `board:label-deleted`         | `board:{id}`      | Label supprimé                        |
| `list:created`                | `board:{id}`      | Nouvelle liste créée                  |
| `list:reordered`              | `board:{id}`      | Listes réordonnées                    |
| `task:created`                | `board:{id}`      | Nouvelle tâche créée                  |
| `task:updated`                | `board:{id}`      | Tâche modifiée                        |
| `task:deleted`                | `board:{id}`      | Tâche supprimée                       |
| `task:moved`                  | `board:{id}`      | Tâche déplacée entre listes           |
| `task:reordered`              | `board:{id}`      | Tâches réordonnées dans une liste     |
| `task:assignee-added`         | `board:{id}`      | Assignation ajoutée                   |
| `task:assignee-removed`       | `board:{id}`      | Assignation retirée                   |
| `task:label-added`            | `board:{id}`      | Label ajouté à une tâche              |
| `task:label-removed`          | `board:{id}`      | Label retiré d'une tâche              |
| `task:comment-added`          | `board:{id}`      | Commentaire ajouté                    |
| `task:comment-deleted`        | `board:{id}`      | Commentaire supprimé                  |
| `task:checklist-created`      | `board:{id}`      | Checklist créée                       |
| `task:checklist-deleted`      | `board:{id}`      | Checklist supprimée                   |
| `task:checklist-item-added`   | `board:{id}`      | Item de checklist ajouté              |
| `task:checklist-item-updated` | `board:{id}`      | Item de checklist modifié             |
| `task:checklist-item-deleted` | `board:{id}`      | Item de checklist supprimé            |
| `notification:new`            | `user:{id}`       | Nouvelle notification reçue           |
