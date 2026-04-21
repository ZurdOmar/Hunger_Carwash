const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mmarhgfumtzsmppntylh.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2]; // sb_secret_...
const TARGET_EMAIL = process.argv[3];
const NEW_PASSWORD = process.argv[4];

if (!SERVICE_ROLE_KEY || !TARGET_EMAIL || !NEW_PASSWORD) {
  console.log('Uso: node resetear-password.js <SERVICE_ROLE_KEY> <EMAIL> <NUEVA_CONTRASEÑA>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  console.log(`⏳ Buscando usuario: ${TARGET_EMAIL}...`);

  // 1. Buscar al usuario por email para obtener su ID
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error al listar usuarios:', listError.message);
    return;
  }

  const user = users.find(u => u.email === TARGET_EMAIL);

  if (!user) {
    console.error('❌ No se encontró ningún usuario con ese correo.');
    return;
  }

  console.log(`✅ Usuario encontrado (ID: ${user.id})`);
  console.log(`⏳ Actualizando contraseña...`);

  // 2. Forzar la nueva contraseña y marcar como configurada
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { 
      password: NEW_PASSWORD,
      user_metadata: { ...user.user_metadata, password_set: true }
    }
  );

  if (updateError) {
    console.error('❌ Error al actualizar contraseña:', updateError.message);
  } else {
    console.log('\n✨ ¡CONTRASEÑA ACTUALIZADA CON ÉXITO! ✨');
    console.log(`📧 Usuario: ${TARGET_EMAIL}`);
    console.log(`🔑 Nueva clave: ${NEW_PASSWORD}`);
    console.log('\nYa puedes intentar loguearte de nuevo.');
  }
}

resetPassword();
