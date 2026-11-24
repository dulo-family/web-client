import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Schemas } from '../../core/api/api';

const BUILT_IN_ROLES = ['admin', 'editor', 'contributor', 'viewer'];

/** A role's display name: the translation for built-in roles, else the name the server has. */
@Pipe({ name: 'roleName', pure: false })
export class RoleNamePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(key: string, roles: readonly Schemas['RoleResponse'][]): string {
    return BUILT_IN_ROLES.includes(key)
      ? this.transloco.translate(`role.${key}`)
      : (roles.find((role) => role.key === key)?.name ?? key);
  }
}
