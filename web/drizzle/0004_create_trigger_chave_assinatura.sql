-- Migration: Criar trigger para gerar chave de ativação automaticamente
-- Quando uma assinatura é criada ou atualizada com status 'ativa'

-- Função para gerar chave de ativação única
CREATE OR REPLACE FUNCTION gerar_chave_ativacao()
RETURNS TEXT AS $$
DECLARE
  chave TEXT;
  tentativas INTEGER := 0;
  max_tentativas INTEGER := 20;
  hash_md5 TEXT;
BEGIN
  LOOP
    -- Gerar hash MD5 e extrair partes
    hash_md5 := MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || RANDOM()::TEXT);
    
    -- Formato: XXXX-XXXX-XXXX-XXXX (16 caracteres hexadecimais)
    chave := UPPER(
      SUBSTRING(hash_md5 FROM 1 FOR 4) || '-' ||
      SUBSTRING(hash_md5 FROM 5 FOR 4) || '-' ||
      SUBSTRING(hash_md5 FROM 9 FOR 4) || '-' ||
      SUBSTRING(hash_md5 FROM 13 FOR 4)
    );
    
    -- Verificar se já existe
    IF NOT EXISTS (SELECT 1 FROM chaves_ativacao WHERE chave = chave) THEN
      RETURN chave;
    END IF;
    
    tentativas := tentativas + 1;
    IF tentativas >= max_tentativas THEN
      RAISE EXCEPTION 'Não foi possível gerar chave única após % tentativas', max_tentativas;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para criar/atualizar chave de ativação quando assinatura é criada/atualizada
CREATE OR REPLACE FUNCTION criar_chave_para_assinatura()
RETURNS TRIGGER AS $$
DECLARE
  admin_id TEXT;
  chave_existente UUID;
  nova_chave TEXT;
  user_role TEXT;
BEGIN
  -- Só processar se status for 'ativa'
  IF NEW.status != 'ativa' THEN
    RETURN NEW;
  END IF;
  
  -- Verificar role do usuário
  -- Apenas usuários com role 'user' recebem chave de ativação
  -- Admins podem ter assinaturas (infinitas), mas não recebem chaves
  SELECT role INTO user_role
  FROM users
  WHERE id = NEW.user_id
  LIMIT 1;
  
  -- Se não encontrar o usuário ou se não for 'user', não criar chave
  IF user_role IS NULL OR user_role != 'user' THEN
    -- Se for admin, não criar chave (admins têm assinatura infinita, mas não precisam de chave)
    IF user_role = 'admin' THEN
      RETURN NEW; -- Permite a assinatura ser criada, mas sem chave
    END IF;
    -- Para outros casos, também não criar
    RETURN NEW;
  END IF;
  
  -- Buscar um admin para usar como criado_por
  SELECT id INTO admin_id
  FROM users
  WHERE role = 'admin'
  LIMIT 1;
  
  -- Se não houver admin, usar o próprio usuário
  IF admin_id IS NULL THEN
    admin_id := NEW.user_id;
  END IF;
  
  -- Verificar se já existe chave ativa para este usuário
  SELECT id INTO chave_existente
  FROM chaves_ativacao
  WHERE user_id = NEW.user_id
    AND tipo = 'assinatura'
    AND status = 'ativa'
  LIMIT 1;
  
  IF chave_existente IS NOT NULL THEN
    -- Atualizar chave existente
    UPDATE chaves_ativacao
    SET 
      status = 'ativa',
      data_expiracao = NEW.data_fim,
      ultimo_uso = NOW(),
      updated_at = NOW()
    WHERE id = chave_existente;
  ELSE
    -- Gerar nova chave
    nova_chave := gerar_chave_ativacao();
    
    -- Criar nova chave
    INSERT INTO chaves_ativacao (
      chave,
      user_id,
      tipo,
      status,
      data_expiracao,
      criado_por,
      usado_em,
      created_at,
      updated_at
    ) VALUES (
      nova_chave,
      NEW.user_id,
      'assinatura',
      'ativa',
      NEW.data_fim,
      admin_id,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger AFTER INSERT
DROP TRIGGER IF EXISTS trigger_criar_chave_assinatura_insert ON assinaturas;
CREATE TRIGGER trigger_criar_chave_assinatura_insert
AFTER INSERT ON assinaturas
FOR EACH ROW
WHEN (NEW.status = 'ativa')
EXECUTE FUNCTION criar_chave_para_assinatura();

-- Criar trigger AFTER UPDATE
DROP TRIGGER IF EXISTS trigger_criar_chave_assinatura_update ON assinaturas;
CREATE TRIGGER trigger_criar_chave_assinatura_update
AFTER UPDATE ON assinaturas
FOR EACH ROW
WHEN (NEW.status = 'ativa' AND (OLD.status != 'ativa' OR OLD.data_fim != NEW.data_fim))
EXECUTE FUNCTION criar_chave_para_assinatura();

