const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseAdmin = createClient(
  'https://ngnrmxdbzbolxroibzax.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbnJteGRiemJvbHhyb2liemF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc1OTUwNCwiZXhwIjoyMTAwMzM1NTA0fQ.YvN_5qym5pc03jNcLbsekTO9kGSKJSi9RvaSIKV9Oo8',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      transport: ws
    }
  }
);

async function main() {
  const email = 'contatopriveloja@gmail.com';
  const password = 'Prive@2026';

  console.log(`Verificando/Criando usuário ${email}...`);

  // Tenta buscar o usuário
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError);
  }

  let existing = usersData?.users?.find(u => u.email === email);

  if (existing) {
    console.log(`Usuário ${email} já existe (ID: ${existing.id}). Atualizando senha...`);
    const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Privê Admin', role: 'admin' }
    });
    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
    } else {
      console.log("Senha atualizada com sucesso!");
    }
  } else {
    console.log(`Criando novo usuário ${email}...`);
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Privê Admin', role: 'admin' }
    });
    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      return;
    }
    existing = created.user;
    console.log(`Usuário criado com sucesso! (ID: ${existing.id})`);
  }

  // Garantir que exista na tabela public.profiles
  if (existing) {
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: existing.id,
      email: existing.email,
      full_name: 'Privê Admin',
      updated_at: new Date().toISOString()
    });
    if (profileError) {
      console.error("Erro ao atualizar perfil na tabela profiles:", profileError);
    } else {
      console.log("Perfil criado/atualizado na tabela public.profiles!");
    }
  }
}

main().catch(console.error);
