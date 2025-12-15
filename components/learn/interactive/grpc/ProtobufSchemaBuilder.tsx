'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode, Play, CheckCircle2 } from 'lucide-react';

interface ProtoExample {
  title: string;
  description: string;
  proto: string;
  generatedCSharp: string;
  usage: string;
}

const examples: ProtoExample[] = [
  {
    title: 'Simple Message',
    description: 'Basic user message with primitive types',
    proto: `syntax = "proto3";

package users;

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  bool is_active = 4;
}`,
    generatedCSharp: `public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public bool IsActive { get; set; }
}`,
    usage: `// Create and serialize
var user = new User {
    Id = 1,
    Name = "Alice",
    Email = "alice@example.com",
    IsActive = true
};

byte[] data = user.ToByteArray();`,
  },
  {
    title: 'Nested Messages',
    description: 'Complex structure with nested types',
    proto: `syntax = "proto3";

message Address {
  string street = 1;
  string city = 2;
  string country = 3;
}

message Employee {
  int32 id = 1;
  string name = 2;
  Address home_address = 3;
  repeated string skills = 4;
}`,
    generatedCSharp: `public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string Country { get; set; }
}

public class Employee
{
    public int Id { get; set; }
    public string Name { get; set; }
    public Address HomeAddress { get; set; }
    public RepeatedField<string> Skills { get; set; }
}`,
    usage: `var employee = new Employee {
    Id = 101,
    Name = "Bob",
    HomeAddress = new Address {
        Street = "123 Main St",
        City = "Boston",
        Country = "USA"
    },
    Skills = { "C#", "gRPC", "SQL" }
};`,
  },
  {
    title: 'Enumerations',
    description: 'Using enums for fixed sets of values',
    proto: `syntax = "proto3";

enum OrderStatus {
  UNKNOWN = 0;
  PENDING = 1;
  PROCESSING = 2;
  SHIPPED = 3;
  DELIVERED = 4;
  CANCELLED = 5;
}

message Order {
  string order_id = 1;
  OrderStatus status = 2;
  double total_amount = 3;
}`,
    generatedCSharp: `public enum OrderStatus
{
    Unknown = 0,
    Pending = 1,
    Processing = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5
}

public class Order
{
    public string OrderId { get; set; }
    public OrderStatus Status { get; set; }
    public double TotalAmount { get; set; }
}`,
    usage: `var order = new Order {
    OrderId = "ORD-12345",
    Status = OrderStatus.Shipped,
    TotalAmount = 299.99
};

// Update status
order.Status = OrderStatus.Delivered;`,
  },
];

export function ProtobufSchemaBuilder() {
  const [selectedExample, setSelectedExample] = useState(0);
  const [activeTab, setActiveTab] = useState('proto');
  const currentExample = examples[selectedExample];

  return (
    <Card className="p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-500" />
          Protocol Buffers Schema Builder
        </h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Interactive
        </Badge>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {examples.map((example, index) => (
          <Button
            key={index}
            size="sm"
            variant={selectedExample === index ? 'default' : 'outline'}
            onClick={() => setSelectedExample(index)}
          >
            {example.title}
          </Button>
        ))}
      </div>

      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">{currentExample.description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proto">
            <FileCode className="w-4 h-4 mr-2" />
            .proto File
          </TabsTrigger>
          <TabsTrigger value="csharp">
            <Play className="w-4 h-4 mr-2" />
            Generated C#
          </TabsTrigger>
          <TabsTrigger value="usage">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Usage Example
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proto" className="mt-4">
          <div className="relative">
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
              <code>{currentExample.proto}</code>
            </pre>
            <div className="absolute top-2 right-2">
              <Badge variant="secondary">syntax = &quot;proto3&quot;</Badge>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded bg-green-50 dark:bg-green-950/20">
              <h5 className="font-semibold text-sm mb-1 text-green-900 dark:text-green-100">Field Numbers</h5>
              <p className="text-xs text-green-800 dark:text-green-200">
                Each field has a unique number (= 1, = 2, etc.) used in binary encoding
              </p>
            </div>
            <div className="p-3 border rounded bg-purple-50 dark:bg-purple-950/20">
              <h5 className="font-semibold text-sm mb-1 text-purple-900 dark:text-purple-100">Data Types</h5>
              <p className="text-xs text-purple-800 dark:text-purple-200">
                Proto3 types: int32, int64, string, bool, double, bytes, repeated
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="csharp" className="mt-4">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code>{currentExample.generatedCSharp}</code>
          </pre>
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              <strong>Auto-generated:</strong> This C# code is automatically generated from the .proto file using the
              <code className="mx-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">protoc</code> compiler
            </p>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code>{currentExample.usage}</code>
          </pre>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded bg-blue-50 dark:bg-blue-950/20">
              <h5 className="font-semibold text-sm mb-1 text-blue-900 dark:text-blue-100">Serialization</h5>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.ToByteArray()</code> converts to compact binary format
              </p>
            </div>
            <div className="p-3 border rounded bg-green-50 dark:bg-green-950/20">
              <h5 className="font-semibold text-sm mb-1 text-green-900 dark:text-green-100">Deserialization</h5>
              <p className="text-xs text-green-800 dark:text-green-200">
                <code className="bg-green-100 dark:bg-green-900 px-1 rounded">.Parser.ParseFrom(bytes)</code> reconstructs the object
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 rounded">
        <h5 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Why Protocol Buffers?</h5>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• <strong>Compact:</strong> Binary encoding is 3-10x smaller than JSON</li>
          <li>• <strong>Fast:</strong> Parsing is 20-100x faster than JSON</li>
          <li>• <strong>Type-safe:</strong> Schema enforces data structure at compile-time</li>
          <li>• <strong>Versioned:</strong> Can evolve schemas without breaking existing code</li>
        </ul>
      </div>
    </Card>
  );
}
