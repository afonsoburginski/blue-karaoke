-- Migração para criar usuário admin inicial
-- Email: afonsoburginski@gmail.com
-- Senha: 123456789 (hash bcrypt)

-- Verificar se o usuário já existe
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id UUID;
    password_hash TEXT;
BEGIN
    -- Verificar se usuário já existe
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'afonsoburginski@gmail.com') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Gerar UUID para o usuário
        user_id := gen_random_uuid();
        
        -- Hash bcrypt da senha "123456789"
        -- Este hash foi gerado com bcryptjs (10 rounds)
        password_hash := '$2b$10$fJLfEzNB89bNIbj2Woz6x.n5xfQY2wWi9w.OP5Apk3fq4fm2gzpem';
        
        -- Inserir usuário admin
        INSERT INTO users (
            id,
            slug,
            name,
            email,
            email_verified,
            password,
            role,
            user_type,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'afonso-burginski',
            'Afonso Burginski',
            'afonsoburginski@gmail.com',
            true,
            password_hash,
            'admin',
            'subscriber',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Usuário admin criado com sucesso!';
    ELSE
        RAISE NOTICE 'Usuário admin já existe.';
    END IF;
END $$;

