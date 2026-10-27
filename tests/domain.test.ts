import { describe, expect, it } from 'vitest';
import { filterBooks, parseInventory, validateReflection, mostReadBooks, profileIsComplete, validateReaderName } from '../src/lib/domain';
const books = [{id:'1',title:'Oración y vida',author:'María Pérez',category:'Oración y vida monástica'}, {id:'2',title:'Camino interior',author:'José',category:'Espiritualidad'}];
describe('Catalog discovery and inventory validation', () => {
  it('searches accents and author names and combines category filters', () => {
    expect(filterBooks(books,'maria','')).toEqual([books[0]]);
    expect(filterBooks(books,'ORACION','Espiritualidad')).toEqual([]);
    expect(filterBooks(books,'','Espiritualidad')).toEqual([books[1]]);
  });
  it('rejects empty and oversized reflections, counts Unicode characters', () => {
    expect(validateReflection(' \n ')).toBeTruthy();
    expect(validateReflection('a'.repeat(1501))).toBeTruthy();
    expect(validateReflection('🙏'.repeat(1500))).toBeNull();
  });
  it('parses quoted CSV fields and preserves commas in descriptions', () => {
    const result = parseInventory('titulo,autor,categoria,descripcion,portada,isbn\n"Mi libro",Autora,Espiritualidad,"Una idea, otra idea",portada.jpg,');
    expect(result.errors).toEqual([]);
    expect(result.books[0].description).toBe('Una idea, otra idea');
    expect(result.books[0].cover_file).toBe('portada.jpg');
  });
  it('rejects unknown categories, missing required fields, duplicate editions, unsafe cover URLs', () => {
    expect(parseInventory('titulo,autor,categoria,descripcion\nLibro,Autor,Otra,Texto').errors.length).toBeGreaterThan(0);
    expect(parseInventory('titulo,autor,categoria,descripcion\n,Autor,Espiritualidad,Texto').errors.length).toBeGreaterThan(0);
    expect(parseInventory('titulo,autor,categoria,descripcion,portada\nLibro,Autor,Espiritualidad,Texto,javascript:alert(1)').errors.length).toBeGreaterThan(0);
    expect(parseInventory('titulo,autor,categoria,descripcion\nLibro,Autor,Espiritualidad,Texto\nLibro,Autor,Espiritualidad,Texto').errors.length).toBeGreaterThan(0);
  });
});

describe('Finished reads and reader identity', () => {
  it('ranks by confirmed readers, ignores zero counts and archived books, and breaks ties by title', () => {
    const catalog=[{id:'a',title:'Zeta',archived:false},{id:'b',title:'Ágape',archived:false},{id:'c',title:'Más leído',archived:true},{id:'d',title:'Sin leer',archived:false}];
    const counts=[{book_id:'a',read_count:2},{book_id:'b',read_count:2},{book_id:'c',read_count:99}];
    expect(mostReadBooks(catalog,counts).map(b=>b.id)).toEqual(['b','a']);
    expect(mostReadBooks(catalog,counts,1).map(b=>b.id)).toEqual(['b']);
    expect(mostReadBooks(catalog,[])).toEqual([]);
    expect(catalog.map(b=>b.id)).toEqual(['a','b','c','d']);
  });
  it('requires both explicit names instead of treating an old alias as a complete profile', () => {
    expect(profileIsComplete({alias:'Ana'})).toBe(false);
    expect(profileIsComplete({first_name:'Ana',last_name:'  '})).toBe(false);
    expect(profileIsComplete({first_name:'Ana María',last_name:'Pérez Soto'})).toBe(true);
    expect(validateReaderName('Ana','')).toBeTruthy();
    expect(validateReaderName('a'.repeat(61),'Pérez')).toBeTruthy();
    expect(validateReaderName('Ana','Pérez')).toBeNull();
  });
});
