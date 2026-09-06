import { prisma } from '@/database/client';

/**
 * Otorga TODOS los permisos del catálogo a un rol por código.
 *
 * Se necesita como paso de arranque (bootstrap): el endpoint
 * `POST /api/roles/:roleId/permisos` exige el permiso `roles.manage`,
 * así que sin este script ningún rol —ni el de administrador— podría
 * obtener su primer permiso.
 *
 *   yarn otorgar-permisos --rol administrador
 */
const parseArgs = (argv: string[]): { rol: string } => {
	const values = new Map<string, string>();

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];

		if (!token.startsWith('--')) {
			continue;
		}

		const next = argv[index + 1];

		if (!next || next.startsWith('--')) {
			throw new Error(`Falta el valor para ${token}`);
		}

		values.set(token.slice(2), next);
		index += 1;
	}

	const rol = values.get('rol');

	if (!rol) {
		throw new Error('Uso: yarn otorgar-permisos --rol <codigo-del-rol>');
	}

	return { rol };
};

const main = async (): Promise<void> => {
	const { rol } = parseArgs(process.argv.slice(2));

	const role = await prisma.role.findFirst({ where: { code: rol, deletedAt: null } });

	if (!role) {
		const disponibles = await prisma.role.findMany({
			where: { deletedAt: null },
			select: { code: true },
		});
		throw new Error(
			`No existe el rol "${rol}". Roles disponibles: ${disponibles.map(r => r.code).join(', ')}`,
		);
	}

	const permissions = await prisma.permission.findMany();

	if (permissions.length === 0) {
		throw new Error('No hay permisos en el catálogo todavía. Corre primero: yarn seed');
	}

	let granted = 0;

	for (const permission of permissions) {
		await prisma.rolePermission.upsert({
			where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
			create: { roleId: role.id, permissionId: permission.id, granted: true },
			update: { granted: true },
		});
		granted += 1;
	}

	console.log(`✅ Rol "${role.name}" (${role.code}) ahora tiene ${granted} permisos.`);
};

main()
	.catch((error: unknown) => {
		console.error('❌ Error en otorgar-permisos:', error instanceof Error ? error.message : error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
