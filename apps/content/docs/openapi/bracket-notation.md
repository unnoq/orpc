---
title: Bracket Notation
description: Represent structured data in limited formats such as URL queries and form data.
---

# Bracket Notation

Bracket Notation encodes structured data in formats with limited syntax, like URL queries and form data. It is used by [OpenAPIHandler](/docs/openapi/openapi-handler) and [OpenAPILink](/docs/openapi/client/openapi-link).

## Usage

1. **Same name (>=2 elements) are represented as an array.**

   ```
   color=red&color=blue → { color: ["red", "blue"] }
   ```

2. **Append `[]` at the end to denote an array.**

   ```
   color[]=red&color[]=blue → { color: ["red", "blue"] }
   ```

3. **Append `[number]` to specify an array index (missing indexes create sparse arrays).**

   ```
   color[0]=red&color[2]=blue → { color: ["red", <empty>, "blue"] }
   ```

4. **Append `[key]` to denote an object property.**

   ```
   color[red]=true&color[blue]=false → { color: { red: true, blue: false } }
   ```

## Limitations

- **Empty Arrays:** Cannot be represented; arrays must have at least one element.
- **Empty Objects:** Cannot be represented. Objects with empty or numeric keys may be interpreted as arrays, so ensure objects include at least one non-empty, non-numeric key.

## Examples

### URL Query

```bash
curl http://example.com/api/example?name[first]=John&name[last]=Doe
```

This query is parsed as:

```json
{
  "name": {
    "first": "John",
    "last": "Doe"
  }
}
```

### Form Data

```bash
curl -X POST http://example.com/api/example \
  -F 'name[first]=John' \
  -F 'name[last]=Doe'
```

This form data is parsed as:

```json
{
  "name": {
    "first": "John",
    "last": "Doe"
  }
}
```

### Complex Example

```bash
curl -X POST http://example.com/api/example \
  -F 'data[names][0][first]=John1' \
  -F 'data[names][0][last]=Doe1' \
  -F 'data[names][1][first]=John2' \
  -F 'data[names][1][last]=Doe2' \
  -F 'data[ages][0]=18' \
  -F 'data[ages][2]=25' \
  -F 'data[files][]=@/path/to/file1' \
  -F 'data[files][]=@/path/to/file2'
```

This form data is parsed as:

```json
{
  "data": {
    "names": [
      { "first": "John1", "last": "Doe1" },
      { "first": "John2", "last": "Doe2" }
    ],
    "ages": ["18", "<empty>", "25"],
    "files": ["<binary data>", "<binary data>"]
  }
}
```
