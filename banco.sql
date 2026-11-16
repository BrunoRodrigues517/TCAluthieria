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

-- em caso de merda no banco, apagar usando isso:
-- DO $$ DECLARE
--     r RECORD;
-- BEGIN
--     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
--         EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
--     END LOOP;
-- END $$;
