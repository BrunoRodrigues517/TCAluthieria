create table cliente (
    cpf char(11) not null primary key,
    nome varchar(100) not null,
    nascimento date not null,
    numero varchar(13) not null,
    cep char(8) not null,
    numero_casa varchar(5)
);

create table tipo_instrumento (
    id serial not null primary key,
    nome varchar(25) not null,
    descricao text
);

create table instrumento_estoque (
    id serial primary key,
    modelo varchar(125) not null,
    tipo_id integer not null references tipo_instrumento(id),
    preco numeric(10, 2) not null check (preco >= 0)
);

create table instrumento_conserto (
    id serial primary key,
    modelo varchar(125) not null,
    estado text not null check (estado in ('nao reparado', 'em conserto', 'reparado')),
    enviado_por char(11) not null references cliente(cpf),
    tipo_id integer not null references tipo_instrumento(id)
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