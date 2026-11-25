create table cliente (
    cpf char(11) unique not null primary key,
    nome varchar(100) not null,
    nascimento date not null,
    email varchar(150) not null,
    senha text not null,
    cep char(8) not null,
    numero_casa varchar(10) not null
);

create unique index if not exists cliente_email_unico
    on cliente (lower(email));

create table tipo_instrumento_estoque (
    id serial not null primary key,
    nome varchar(25) not null,
    descricao text
);

create table tipo_instrumento_conserto (
    id serial not null primary key,
    nome varchar(25) not null,
    descricao text
);

create table instrumento_estoque (
    id serial primary key,
    modelo varchar(125) not null,
    tipo_id integer not null references tipo_instrumento_estoque(id),
    preco numeric(10, 2) not null check (preco >= 0)
);

create table resenha (
    autor char(11) not null references cliente(cpf),
    avaliado integer not null references instrumento_estoque(id),
    nota integer not null check (nota >= 0 and nota <= 10),
    resenha text,
    primary key (autor, avaliado)
);

create table instrumento_conserto (
    id serial primary key,
    modelo varchar(125) not null,
    estado text not null check (estado in ('nao reparado', 'em conserto', 'reparado')),
    enviado_por char(11) not null references cliente(cpf),
    tipo_id integer not null references tipo_instrumento_conserto(id)
);

create table entrega (
    id serial primary key,
    instrumento integer not null references instrumento_conserto(id),
    data_entrega date not null default current_date,
    dono_instrumento char(11) not null references cliente(cpf),
    preco_conserto numeric(10, 2) not null check (preco_conserto >= 0)
);

create table compra (
    id serial primary key,
    feita_por char(11) not null references cliente(cpf),
    instrumento_comprado integer not null references instrumento_estoque(id),
    data_compra date not null default current_date,
    pagamento varchar(7) not null default 'a vista' check (pagamento in ('a vista', '2x', '4x', '6x', '8x'))
);

INSERT INTO cliente (cpf, nome, nascimento, email, senha, cep, numero_casa) VALUES
    ('12345678910', 'Testador da Silva', '2009-09-09', 'testadoroficial@gmail.com', 'testinha', '12345678', '6767');

INSERT INTO tipo_instrumento_estoque (nome) VALUES
    ('Baixo'),
    ('Guitarra'),
    ('Violão'),
    ('Bateria'),
    ('Violino'),
    ('Instrumento de sopro');

INSERT INTO tipo_instrumento_conserto (nome) VALUES
    ('Baixo'),
    ('Guitarra'),
    ('Violão'),
    ('Bateria'),
    ('Violino'),
    ('Instrumento de sopro'),
    ('Outro');

INSERT INTO instrumento_estoque (modelo, tipo_id, preco) VALUES
    ('Yamaha TRBX174', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Baixo'), 2499.90),
    ('Tagima TW-73', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Baixo'), 1699.90),
    ('Squier Affinity Precision Bass', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Baixo'), 4299.90),
    ('Yamaha Pacifica 112J', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Guitarra'), 2799.90),
    ('Squier Affinity Stratocaster', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Guitarra'), 3299.90),
    ('Epiphone Les Paul Special', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Guitarra'), 3599.90),
    ('Yamaha C40', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Violão'), 1199.90),
    ('Giannini N-14', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Violão'), 799.90),
    ('Takamine GD11M', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Violão'), 2399.90),
    ('Pearl Roadshow RS525SC', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Bateria'), 5999.90),
    ('Tama Imperialstar', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Bateria'), 8999.90),
    ('Yamaha Rydeen', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Bateria'), 6499.90),
    ('Eagle VE441', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Violino'), 699.90),
    ('Yamaha V5SC', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Violino'), 4299.90),
    ('Michael VNM40', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Violino'), 899.90),
    ('Yamaha YFL-222', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Instrumento de sopro'), 3299.90),
    ('Yamaha YCL-255', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Instrumento de sopro'), 4499.90),
    ('Yamaha YAS-280', (SELECT id FROM tipo_instrumento_estoque WHERE nome = 'Instrumento de sopro'), 9999.90);

-- em caso de merda no banco, apagar usando isso:
-- DO $$ DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
--         EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
--     END LOOP;
-- END $$;

-- em caso de merda no banco, apagar usando isso:
-- DO $$ DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
--         EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
--     END LOOP;
-- END $$;
