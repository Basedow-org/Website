#!/usr/bin/env python3
"""
Geocode doctors from CSV using Nominatim (OpenStreetMap) geocoding service.
This script reads doctors.csv, geocodes missing coordinates, and updates the file in place.
Run this whenever you add new doctors without coordinates.
"""

import csv
import time
import requests
from urllib.parse import quote

def geocode_address(city):
    """
    Geocode a city using Nominatim (free OpenStreetMap geocoding service).
    Returns (latitude, longitude) or (None, None) if not found.
    """
    # Just use city name for more reliable results
    query = f"{city}, France"
    
    # Nominatim API endpoint
    url = f"https://nominatim.openstreetmap.org/search?q={quote(query)}&format=json&limit=1"
    
    headers = {
        'User-Agent': 'Basedow.org Doctor Directory Geocoder/1.0'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and len(data) > 0:
            lat = data[0]['lat']
            lon = data[0]['lon']
            print(f"  ✓ Found: {lat}, {lon}")
            return lat, lon
        else:
            print(f"  ✗ Not found")
            return None, None
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return None, None

def main():
    input_file = 'doctors.csv'
    
    print("🗺️  Starting geocoding process...\n")
    
    # Read the CSV
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        doctors = list(reader)
    
    total = len(doctors)
    geocoded_count = 0
    skipped_count = 0
    
    # Process each doctor
    for i, doctor in enumerate(doctors, 1):
        print(f"[{i}/{total}] {doctor['name']} - {doctor['city']}")
        
        # Skip if already has coordinates
        if doctor['latitude'].strip() and doctor['longitude'].strip():
            print(f"  → Already has coordinates, skipping")
            skipped_count += 1
            continue
        
        # Geocode the city
        lat, lon = geocode_address(doctor['city'])
        
        if lat and lon:
            doctor['latitude'] = lat
            doctor['longitude'] = lon
            geocoded_count += 1
        
        # Be respectful to the API - wait 1 second between requests
        # Nominatim usage policy requires max 1 request per second
        if i < total:
            time.sleep(1)
    
    # Write back to the same CSV file
    with open(input_file, 'w', encoding='utf-8', newline='') as f:
        fieldnames = doctors[0].keys()
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(doctors)
    
    print(f"\n✅ Done!")
    print(f"   - Geocoded: {geocoded_count} addresses")
    print(f"   - Skipped (already had coords): {skipped_count}")
    print(f"   - Failed: {total - geocoded_count - skipped_count}")
    print(f"   - Updated: {input_file}")

if __name__ == '__main__':
    main()
