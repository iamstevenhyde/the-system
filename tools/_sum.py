import json,re,collections,sys
v=json.load(open('tools/contrast-report.json',encoding='utf-8'))
c=collections.Counter(); ex={}
for x in v:
    for pr in x['problems']:
        k=(x['tag'],re.sub(r'[\d.]+','N',pr)); c[k]+=1; ex.setdefault(k,(x['text'][:34],x['screen'],pr))
print(len(v))
for k,n in c.most_common(int(sys.argv[1]) if len(sys.argv)>1 else 40): print(n,k,ex[k])
