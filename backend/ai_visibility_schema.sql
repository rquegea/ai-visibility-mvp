--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: insights_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insights_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.brands        := NEW.payload->'brands';
  NEW.competitors   := ARRAY(SELECT jsonb_array_elements_text(NEW.payload->'competitors'));
  NEW.opportunities := ARRAY(SELECT jsonb_array_elements_text(NEW.payload->'opportunities'));
  NEW.risks         := ARRAY(SELECT jsonb_array_elements_text(NEW.payload->'risks'));
  NEW.pain_points   := ARRAY(SELECT jsonb_array_elements_text(NEW.payload->'pain_points'));
  NEW.trends        := ARRAY(SELECT jsonb_array_elements_text(NEW.payload->'trends'));
  NEW.quotes        := ARRAY(SELECT jsonb_array_elements_text(NEW.payload->'quotes'));
  RETURN NEW;
END $$;


ALTER FUNCTION public.insights_after_insert() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: citations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.citations (
    id integer NOT NULL,
    mention_id integer,
    title text,
    url text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.citations OWNER TO postgres;

--
-- Name: citations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.citations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.citations_id_seq OWNER TO postgres;

--
-- Name: citations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.citations_id_seq OWNED BY public.citations.id;


--
-- Name: insights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insights (
    id integer NOT NULL,
    query_id integer,
    payload jsonb NOT NULL,
    brands jsonb,
    competitors text[],
    opportunities text[],
    risks text[],
    pain_points text[],
    trends text[],
    quotes text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    top_themes jsonb,
    topic_frequency jsonb,
    source_mentions jsonb,
    calls_to_action jsonb,
    audience_targeting jsonb,
    products_or_features jsonb
);


ALTER TABLE public.insights OWNER TO postgres;

--
-- Name: insights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insights_id_seq OWNER TO postgres;

--
-- Name: insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insights_id_seq OWNED BY public.insights.id;


--
-- Name: mentions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentions (
    id integer NOT NULL,
    query_id integer,
    engine text NOT NULL,
    source text,
    response text NOT NULL,
    sentiment double precision,
    source_url text,
    language text DEFAULT 'unknown'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    emotion text,
    confidence_score double precision,
    confidence double precision,
    source_title text
);


ALTER TABLE public.mentions OWNER TO postgres;

--
-- Name: mentions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentions_id_seq OWNER TO postgres;

--
-- Name: mentions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentions_id_seq OWNED BY public.mentions.id;


--
-- Name: queries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.queries (
    id integer NOT NULL,
    query text NOT NULL,
    brand text,
    topic text,
    enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    language text DEFAULT 'en'::text
);


ALTER TABLE public.queries OWNER TO postgres;

--
-- Name: queries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.queries_id_seq OWNER TO postgres;

--
-- Name: queries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.queries_id_seq OWNED BY public.queries.id;


--
-- Name: citations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citations ALTER COLUMN id SET DEFAULT nextval('public.citations_id_seq'::regclass);


--
-- Name: insights id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insights ALTER COLUMN id SET DEFAULT nextval('public.insights_id_seq'::regclass);


--
-- Name: mentions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentions ALTER COLUMN id SET DEFAULT nextval('public.mentions_id_seq'::regclass);


--
-- Name: queries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queries ALTER COLUMN id SET DEFAULT nextval('public.queries_id_seq'::regclass);


--
-- Name: citations citations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_pkey PRIMARY KEY (id);


--
-- Name: insights insights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_pkey PRIMARY KEY (id);


--
-- Name: mentions mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_pkey PRIMARY KEY (id);


--
-- Name: queries queries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT queries_pkey PRIMARY KEY (id);


--
-- Name: queries unique_query_text; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT unique_query_text UNIQUE (query);


--
-- Name: idx_insights_brands_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insights_brands_gin ON public.insights USING gin (brands);


--
-- Name: idx_insights_competitors_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insights_competitors_gin ON public.insights USING gin (competitors);


--
-- Name: idx_insights_opportunities_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insights_opportunities_gin ON public.insights USING gin (opportunities);


--
-- Name: idx_insights_query_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insights_query_id ON public.insights USING btree (query_id);


--
-- Name: idx_insights_risks_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insights_risks_gin ON public.insights USING gin (risks);


--
-- Name: idx_insights_trends_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_insights_trends_gin ON public.insights USING gin (trends);


--
-- Name: idx_mentions_query_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mentions_query_id ON public.mentions USING btree (query_id);


--
-- Name: insights trg_insights_ai; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_insights_ai BEFORE INSERT ON public.insights FOR EACH ROW EXECUTE FUNCTION public.insights_after_insert();


--
-- Name: citations citations_mention_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.citations
    ADD CONSTRAINT citations_mention_id_fkey FOREIGN KEY (mention_id) REFERENCES public.mentions(id) ON DELETE CASCADE;


--
-- Name: insights insights_query_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_query_id_fkey FOREIGN KEY (query_id) REFERENCES public.queries(id) ON DELETE CASCADE;


--
-- Name: mentions mentions_query_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentions
    ADD CONSTRAINT mentions_query_id_fkey FOREIGN KEY (query_id) REFERENCES public.queries(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

