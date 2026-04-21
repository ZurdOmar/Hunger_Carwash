const { createClient } = require('@supabase/supabase-js');

// Extraer los argumentos (el correo y la llave secreta)
const args = process.argv.slice(2);
const key = args[0];
const email = args[1] || 'elidaleticialopez@gmail.com';

if (!key) {
  console.error("❌ Error: Necesitas poner tu llave secreta. Ejemplo: node generar-invitacion.js sb_secret_xyz123");
  process.exit(1);
}

const supabase = createClient('https://mmarhgfumtzsmppntylh.supabase.co', key);

console.log(`⏳ Generando enlace de invitación para: ${email}...`);

supabase.auth.admin.generateLink({ 
  type: 'invite', 
  email: email,
  options: {
    redirectTo: 'https://hunger-carwash.vercel.app/login?type=invite'
  }
})
  .then(res => {
    if (res.error) {
      console.error('\n❌ Error de Supabase:', res.error.message);
    } else {
      console.log('\n✅ ¡ENLACE GENERADO CON ÉXITO! (Sin mandar correo)\n');
      console.log('🔗 URL:', res.data.properties.action_link);
      console.log('\n👆 COPIA esa URL y ábrela en tu navegador (asegúrate de no estar logueado previamente).');
    }
  })
  .catch(err => console.error('\n❌ Error inesperado:', err));
