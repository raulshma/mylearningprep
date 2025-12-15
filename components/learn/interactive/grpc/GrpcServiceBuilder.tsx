'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Code2, Settings, Zap } from 'lucide-react';

interface ServiceExample {
  name: string;
  description: string;
  proto: string;
  implementation: string;
  client: string;
  streamingType: 'unary' | 'server' | 'client' | 'bidirectional';
}

const services: ServiceExample[] = [
  {
    name: 'Unary RPC',
    description: 'Single request, single response (like REST)',
    streamingType: 'unary',
    proto: `service UserService {
  rpc GetUser (GetUserRequest) returns (UserResponse);
}

message GetUserRequest {
  int32 user_id = 1;
}

message UserResponse {
  int32 id = 1;
  string name = 2;
  string email = 3;
}`,
    implementation: `public class UserService : UserServiceBase
{
    public override async Task<UserResponse> GetUser(
        GetUserRequest request, 
        ServerCallContext context)
    {
        // Fetch user from database
        var user = await _db.Users.FindAsync(request.UserId);
        
        return new UserResponse {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email
        };
    }
}`,
    client: `var client = new UserService.UserServiceClient(channel);

var response = await client.GetUserAsync(
    new GetUserRequest { UserId = 1 }
);

Console.WriteLine($"User: {response.Name}");`,
  },
  {
    name: 'Server Streaming',
    description: 'Single request, stream of responses',
    streamingType: 'server',
    proto: `service StockService {
  rpc WatchStockPrice (StockRequest) 
    returns (stream StockPrice);
}

message StockRequest {
  string symbol = 1;
}

message StockPrice {
  string symbol = 1;
  double price = 2;
  int64 timestamp = 3;
}`,
    implementation: `public override async Task WatchStockPrice(
    StockRequest request, 
    IServerStreamWriter<StockPrice> responseStream,
    ServerCallContext context)
{
    while (!context.CancellationToken.IsCancellationRequested)
    {
        var price = await _stockApi.GetPrice(request.Symbol);
        
        await responseStream.WriteAsync(new StockPrice {
            Symbol = request.Symbol,
            Price = price,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
        
        await Task.Delay(1000); // Update every second
    }
}`,
    client: `using var call = client.WatchStockPrice(
    new StockRequest { Symbol = "AAPL" }
);

await foreach (var price in call.ResponseStream.ReadAllAsync())
{
    Console.WriteLine($"{price.Symbol}: $" + "{price.Price}");
}`,
  },
  {
    name: 'Client Streaming',
    description: 'Stream of requests, single response',
    streamingType: 'client',
    proto: `service SensorService {
  rpc RecordTemperatures (stream TemperatureReading) 
    returns (TemperatureSummary);
}

message TemperatureReading {
  double celsius = 1;
  int64 timestamp = 2;
}

message TemperatureSummary {
  double average = 1;
  double min = 2;
  double max = 3;
  int32 count = 4;
}`,
    implementation: `public override async Task<TemperatureSummary> RecordTemperatures(
    IAsyncStreamReader<TemperatureReading> requestStream,
    ServerCallContext context)
{
    var readings = new List<double>();
    
    await foreach (var reading in requestStream.ReadAllAsync())
    {
        readings.Add(reading.Celsius);
    }
    
    return new TemperatureSummary {
        Average = readings.Average(),
        Min = readings.Min(),
        Max = readings.Max(),
        Count = readings.Count
    };
}`,
    client: `using var call = client.RecordTemperatures();

// Send temperature readings
for (int i = 0; i < 100; i++)
{
    await call.RequestStream.WriteAsync(new TemperatureReading {
        Celsius = Random.Shared.NextDouble() * 30,
        Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
    });
}

await call.RequestStream.CompleteAsync();
var summary = await call.ResponseAsync;`,
  },
  {
    name: 'Bidirectional Streaming',
    description: 'Stream of requests and responses (real-time chat)',
    streamingType: 'bidirectional',
    proto: `service ChatService {
  rpc Chat (stream ChatMessage) 
    returns (stream ChatMessage);
}

message ChatMessage {
  string user_id = 1;
  string message = 2;
  int64 timestamp = 3;
}`,
    implementation: `public override async Task Chat(
    IAsyncStreamReader<ChatMessage> requestStream,
    IServerStreamWriter<ChatMessage> responseStream,
    ServerCallContext context)
{
    var background = Task.Run(async () =>
    {
        await foreach (var msg in requestStream.ReadAllAsync())
        {
            // Broadcast to all connected clients
            await _chatHub.BroadcastMessage(msg);
        }
    });
    
    // Subscribe to chat messages
    await foreach (var msg in _chatHub.Subscribe())
    {
        await responseStream.WriteAsync(msg);
    }
    
    await background;
}`,
    client: `using var call = client.Chat();

// Background task to send messages
_ = Task.Run(async () =>
{
    while (true)
    {
        var message = Console.ReadLine();
        await call.RequestStream.WriteAsync(new ChatMessage {
            UserId = "user123",
            Message = message,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        });
    }
});

// Receive messages
await foreach (var msg in call.ResponseStream.ReadAllAsync())
{
    Console.WriteLine($"{msg.UserId}: {msg.Message}");
}`,
  },
];

export function GrpcServiceBuilder() {
  const [selectedService, setSelectedService] = useState(0);
  const [activeTab, setActiveTab] = useState('proto');
  const currentService = services[selectedService];

  const streamingIcons = {
    unary: '→',
    server: '→→→',
    client: '<<<',
    bidirectional: '⟷',
  };

  const streamingColors = {
    unary: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100',
    server: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100',
    client: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100',
    bidirectional: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100',
  };

  return (
    <Card className="p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Server className="w-5 h-5 text-purple-500" />
          gRPC Service Builder
        </h3>
        <Badge className={streamingColors[currentService.streamingType]}>
          {streamingIcons[currentService.streamingType]} {currentService.streamingType}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {services.map((service, index) => (
          <Button
            key={index}
            size="sm"
            variant={selectedService === index ? 'default' : 'outline'}
            onClick={() => setSelectedService(index)}
            className="flex flex-col items-start h-auto py-3"
          >
            <span className="font-semibold">{service.name}</span>
            <span className="text-xs opacity-80">{streamingIcons[service.streamingType]}</span>
          </Button>
        ))}
      </div>

      <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <p className="text-sm text-purple-900 dark:text-purple-100">{currentService.description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proto">
            <Code2 className="w-4 h-4 mr-2" />
            Service Definition
          </TabsTrigger>
          <TabsTrigger value="server">
            <Server className="w-4 h-4 mr-2" />
            Server Implementation
          </TabsTrigger>
          <TabsTrigger value="client">
            <Zap className="w-4 h-4 mr-2" />
            Client Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proto" className="mt-4">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code>{currentService.proto}</code>
          </pre>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
            <h5 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">Service Definition</h5>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              The <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">rpc</code> keyword defines methods.
              The <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">stream</code> keyword indicates streaming (can be on request, response, or both).
            </p>
          </div>
        </TabsContent>

        <TabsContent value="server" className="mt-4">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code>{currentService.implementation}</code>
          </pre>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded bg-green-50 dark:bg-green-950/20">
              <h5 className="font-semibold text-sm mb-1 text-green-900 dark:text-green-100">Base Class</h5>
              <p className="text-xs text-green-800 dark:text-green-200">
                Inherit from auto-generated <code className="bg-green-100 dark:bg-green-900 px-1 rounded">ServiceBase</code> class
              </p>
            </div>
            <div className="p-3 border rounded bg-purple-50 dark:bg-purple-950/20">
              <h5 className="font-semibold text-sm mb-1 text-purple-900 dark:text-purple-100">ServerCallContext</h5>
              <p className="text-xs text-purple-800 dark:text-purple-200">
                Access headers, cancellation tokens, peer info, and metadata
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="client" className="mt-4">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
            <code>{currentService.client}</code>
          </pre>
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <h5 className="font-semibold text-sm mb-2 text-yellow-900 dark:text-yellow-100">Client Stub</h5>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              The client is auto-generated from the .proto file. It handles all serialization, HTTP/2 communication, and deserialization automatically.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
