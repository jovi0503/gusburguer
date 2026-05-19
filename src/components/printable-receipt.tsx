
'use client';

import type { Order } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PrintableReceiptProps {
    order: Order;
}

const PICKUP_ADDRESS_ID = 'pickup';

const neighborhoodDisplayMap: { [key: string]: string } = {
    'pernambues': 'Pernambués',
};

export const PrintableReceipt = ({ order }: PrintableReceiptProps) => {

    if (!order) return null;

    const deliveryFee = order.shippingCost ?? 0;
    const subtotal = order.total - deliveryFee;
    const isPickup = order.shippingAddress.id === PICKUP_ADDRESS_ID;
    const changeAmount = order.paymentMethod === 'cash' && order.changeFor ? order.changeFor - order.total : 0;
    
    const displayNeighborhood = neighborhoodDisplayMap[order.shippingAddress.neighborhood.toLowerCase()] || order.shippingAddress.neighborhood;

    return (
        <div style={{ fontFamily: 'monospace', color: 'black', width: '100%' }}>
            
            <h2 style={{ textAlign: 'center', margin: '0', fontSize: '16px', fontWeight: 'bold' }}>BORA BEBER</h2>
            
            <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

            <div style={{ textAlign: 'center', fontSize: '12px' }}>
                {format(new Date(order.createdAt), "dd/MM/yyyy - HH:mm", { locale: ptBR })}<br />
                #{order.id.substring(0, 8).toUpperCase()}
            </div>

            <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

            <div style={{ fontSize: '12px' }}>
                <p><strong>Cliente:</strong> {order.user?.name || 'Não identificado'}</p>
                <p><strong>Telefone:</strong> {order.user?.phone || 'Não informado'}</p>
            </div>

            {isPickup ? (
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', margin: '10px 0', padding: '5px', border: '1px solid black' }}>
                    RETIRADA NO LOCAL
                </div>
            ) : (
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    <p><strong>Bairro:</strong> {displayNeighborhood}</p>
                    <p><strong>Endereço:</strong> {order.shippingAddress.street}, {order.shippingAddress.number}</p>
                    {order.shippingAddress.complement && <p><strong>Comp:</strong> {order.shippingAddress.complement}</p>}
                    <p>{order.shippingAddress.city} - {order.shippingAddress.state}</p>
                </div>
            )}

            <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

            {order.items.map(item => (
                <div key={item.product.id} style={{ fontSize: '12px', overflow: 'hidden' }}>
                    <span>{item.quantity}x {item.product.name}</span>
                    <span style={{ float: 'right' }}>{(item.product.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            ))}

            <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

            <div style={{ fontSize: '12px', overflow: 'hidden' }}>
                <span>Subtotal</span>
                <span style={{ float: 'right' }}>{subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ fontSize: '12px', overflow: 'hidden' }}>
                <span>Taxa</span>
                <span style={{ float: 'right' }}>{deliveryFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

            <div style={{ fontSize: '14px', fontWeight: 'bold', overflow: 'hidden' }}>
                <span>Total</span>
                <span style={{ float: 'right' }}>R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>

             <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

            <div style={{ fontSize: '12px' }}>
                <p><strong>Pagamento:</strong> {order.paymentMethod === 'card' ? 'Cartão na Entrega' : 'Dinheiro'}</p>
                {order.paymentMethod === 'cash' && order.changeFor && (
                  <p><strong>Troco para:</strong> R$ {order.changeFor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                )}
                {changeAmount > 0 && (
                  <p><strong>DEVOLVER:</strong> <strong style={{fontSize: '16px'}}>R$ {changeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                )}
            </div>

            <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>

            <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
                <p>Este documento não é fiscal<br />Desenvolvido por: João Vítor Santana</p>
            </div>
        </div>
    );
};

    