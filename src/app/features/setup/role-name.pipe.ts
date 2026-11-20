import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Schemas } from '../../core/api/api';

const BUILT_IN_ROLES = ['admin', 'editor', 'contributor', 'viewer'];

/**
 * A role's display name: the translation for built-in roles, else the name the server has. Takes
 * one key or several (joined with commas).
 */
@Pipe({ name: 'roleName', pure: false })
export class RoleNamePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(keys: string | readonly string[], roles: readonly Schemas['RoleResponse'][]): string {
    return [keys]
      .flat()
      .map((key) =>
        BUILT_IN_ROLES.includes(key)
          ? this.transloco.translate(`role.${key}`)
          : (roles.find((role) => role.key === key)?.name ?? key),
      )
      .join(', ');
  }
}
